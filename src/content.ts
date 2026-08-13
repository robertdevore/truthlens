import { DEFAULT_SETTINGS, type AnalysisResult, type Settings } from './types';
import { imagePriority } from './image-priority';

const analyzed = new WeakMap<HTMLImageElement, string>();
const pending = new Set<HTMLImageElement>();
const nearViewport = new WeakSet<HTMLImageElement>();
const loadTracked = new WeakSet<HTMLImageElement>();
const queued = new Set<HTMLImageElement>();
const MAX_ACTIVE_ANALYSES = 4;
let settings: Settings = DEFAULT_SETTINGS;
let activeAnalyses = 0;
let pumpScheduled = false;

function scoreText(score: number): string {
  return `${Math.round(score * 100)}% AI`;
}

function setBadge(image: HTMLImageElement, result: AnalysisResult): void {
  const parent = image.parentElement;
  if (!parent) return;

  const isAi = result.verdict === 'ai';
  image.classList.toggle('truthlens-ai-image', isAi);
  let badge = parent.querySelector<HTMLElement>(':scope > .truthlens-score');
  if (result.verdict === 'error' || (result.verdict === 'real' && !settings.showRealScores)) {
    badge?.remove();
    return;
  }

  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'truthlens-score';
    badge.setAttribute('role', 'status');
    parent.append(badge);
  }
  badge.dataset.verdict = result.verdict;
  badge.textContent = isAi ? `AI · ${Math.round(result.aiConfidence * 100)}%` : scoreText(result.aiConfidence);
  badge.setAttribute('aria-label', `TruthLens ${result.verdict}: ${Math.round(result.aiConfidence * 100)} percent AI confidence`);
  badge.title = `TruthLens: ${Math.round(result.aiConfidence * 100)}% probability of AI generation · ${Math.round(result.inferenceMs)} ms · ${result.backend}`;
  image.dataset.truthlensScore = String(result.aiConfidence);
  image.dataset.truthlensVerdict = result.verdict;
}

async function analyzeImage(image: HTMLImageElement): Promise<void> {
  const url = image.currentSrc || image.src;
  if (!settings.enabled || !url || url.startsWith('chrome-extension:')) return;
  if (Math.min(image.naturalWidth, image.naturalHeight) < settings.minimumPixels) return;
  if (analyzed.get(image) === url || pending.has(image)) return;
  pending.add(image);
  const requestId = crypto.randomUUID();
  try {
    const result = await chrome.runtime.sendMessage({ target: 'background', type: 'analyze', requestId, url }) as AnalysisResult;
    if (result?.requestId === requestId) {
      analyzed.set(image, url);
      setBadge(image, result);
    }
  } catch {
    // Extension reloads and protected browser pages can invalidate a content-script context.
  } finally {
    pending.delete(image);
  }
}

function nextImage(): HTMLImageElement | undefined {
  let selected: HTMLImageElement | undefined;
  let selectedPriority = Number.POSITIVE_INFINITY;
  for (const image of queued) {
    if (!nearViewport.has(image) || !image.isConnected) {
      queued.delete(image);
      continue;
    }
    const priority = imagePriority(image.getBoundingClientRect(), innerWidth, innerHeight);
    if (priority < selectedPriority) {
      selected = image;
      selectedPriority = priority;
    }
  }
  if (selected) queued.delete(selected);
  return selected;
}

function pumpQueue(): void {
  pumpScheduled = false;
  while (activeAnalyses < MAX_ACTIVE_ANALYSES) {
    const image = nextImage();
    if (!image) return;
    activeAnalyses += 1;
    void analyzeImage(image).finally(() => {
      activeAnalyses -= 1;
      schedulePump();
    });
  }
}

function schedulePump(): void {
  if (pumpScheduled) return;
  pumpScheduled = true;
  queueMicrotask(pumpQueue);
}

function queueImage(image: HTMLImageElement): void {
  if (!nearViewport.has(image)) return;
  queued.add(image);
  schedulePump();
}

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!(entry.target instanceof HTMLImageElement)) continue;
    if (entry.isIntersecting) {
      nearViewport.add(entry.target);
      queueImage(entry.target);
    } else {
      nearViewport.delete(entry.target);
      queued.delete(entry.target);
    }
  }
}, { rootMargin: '100px 0px' });

function trackImage(image: HTMLImageElement): void {
  observer.observe(image);
  if (loadTracked.has(image)) return;
  loadTracked.add(image);
  image.addEventListener('load', () => queueImage(image));
}

function discover(root: ParentNode): void {
  if (root instanceof HTMLImageElement) trackImage(root);
  root.querySelectorAll?.('img').forEach(trackImage);
}

void chrome.storage.sync.get(DEFAULT_SETTINGS).then((stored) => {
  settings = { ...DEFAULT_SETTINGS, ...stored };
  discover(document);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  const changed = Object.fromEntries(
    (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[])
      .filter((key) => changes[key])
      .map((key) => [key, changes[key]?.newValue])
  ) as Partial<Settings>;
  settings = { ...settings, ...changed };
  if (settings.enabled) document.querySelectorAll('img').forEach(queueImage);
});

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => { if (node instanceof Element) discover(node); });
    if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) queueImage(mutation.target);
  }
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
