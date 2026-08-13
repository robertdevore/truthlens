import { errorMessage } from './runtime';
import { DEFAULT_SETTINGS, type ModelProgress, type ModelStage, type Settings } from './types';

const status = document.querySelector<HTMLElement>('#status');
const prepare = document.querySelector<HTMLButtonElement>('#prepare');
const progressPanel = document.querySelector<HTMLElement>('#setup-progress');
const progress = document.querySelector<HTMLProgressElement>('#model-progress');
const progressPercent = document.querySelector<HTMLOutputElement>('#progress-percent');
const progressDetail = document.querySelector<HTMLElement>('#progress-detail');
const stages: Exclude<ModelStage, 'ready' | 'error'>[] = ['download', 'verify', 'cache', 'initialize', 'warmup'];

function setStatus(state: 'idle' | 'active' | 'success' | 'error', text: string): void {
  if (!status) return;
  status.dataset.state = state;
  status.textContent = text;
}

function renderProgress(update: ModelProgress): void {
  if (progressPanel) {
    progressPanel.hidden = false;
    progressPanel.dataset.state = update.stage;
  }
  if (progress) progress.value = update.percent;
  if (progressPercent) progressPercent.value = `${update.percent}%`;
  let detail = update.detail;
  if (update.stage === 'download' && update.loadedBytes !== undefined && update.totalBytes) {
    detail += ` ${Math.round(update.loadedBytes / 1024 / 1024)} of ${Math.round(update.totalBytes / 1024 / 1024)} MB`;
  }
  if (progressDetail) progressDetail.textContent = detail;

  const activeIndex = update.stage === 'ready' ? stages.length : stages.indexOf(update.stage as typeof stages[number]);
  document.querySelectorAll<HTMLElement>('[data-model-stage]').forEach((step) => {
    const index = stages.indexOf(step.dataset.modelStage as typeof stages[number]);
    step.dataset.state = update.stage === 'error' && (step.dataset.state === 'active' || step.dataset.state === 'error')
      ? 'error'
      : index < activeIndex || update.stage === 'ready'
        ? 'complete'
        : index === activeIndex
          ? 'active'
          : 'pending';
  });

  if (update.stage === 'ready') setStatus('success', update.detail);
  else if (update.stage === 'error') setStatus('error', `Setup failed: ${update.detail}`);
  else setStatus('active', 'Model setup in progress');
}

async function refresh(): Promise<void> {
  const state = await chrome.storage.local.get(['modelReady', 'modelBytes']);
  if (state.modelReady) {
    renderProgress({ target: 'ui', type: 'model-progress', stage: 'ready', percent: 100, detail: `Ready offline · ${Math.round((Number(state.modelBytes) || 0) / 1024 / 1024)} MB model cached` });
    if (prepare) prepare.textContent = 'Model ready';
  } else {
    setStatus('idle', 'Model not installed');
  }
}

prepare?.addEventListener('click', async () => {
  prepare.disabled = true;
  prepare.textContent = 'Setting up local model…';
  renderProgress({ target: 'ui', type: 'model-progress', stage: 'download', percent: 1, detail: 'Starting secure model setup…' });
  try {
    const result = await chrome.runtime.sendMessage({ target: 'background', type: 'prepare-model' });
    if (result?.ok) {
      renderProgress({ target: 'ui', type: 'model-progress', stage: 'ready', percent: 100, detail: `Ready offline with ${result.backend}` });
      prepare.textContent = 'Model ready';
    } else {
      renderProgress({ target: 'ui', type: 'model-progress', stage: 'error', percent: progress?.value ?? 0, detail: result?.error ?? 'Unknown setup error' });
      prepare.textContent = 'Try setup again';
    }
  } catch (error) {
    renderProgress({ target: 'ui', type: 'model-progress', stage: 'error', percent: progress?.value ?? 0, detail: errorMessage(error) });
    prepare.textContent = 'Try setup again';
  } finally {
    prepare.disabled = false;
  }
});

chrome.runtime.onMessage.addListener((message: ModelProgress) => {
  if (message?.target === 'ui' && message.type === 'model-progress') renderProgress(message);
});

for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
  const input = document.querySelector<HTMLInputElement>(`#${key}`);
  if (!input) continue;
  void chrome.storage.sync.get({ [key]: DEFAULT_SETTINGS[key] }).then((value) => {
    if (input.type === 'checkbox') input.checked = Boolean(value[key]);
    else input.value = String(value[key]);
  });
  input.addEventListener('change', () => {
    const value = input.type === 'checkbox' ? input.checked : Number(input.value);
    void chrome.storage.sync.set({ [key]: value });
  });
}

void refresh();
