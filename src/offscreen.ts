import * as ort from 'onnxruntime-web/webgpu';
import { calibrateAiConfidence, verdictFor } from './calibration';
import { INPUT_SIZE, rgbaToChw } from './preprocess';
import { MODEL_CACHE, MODEL_CACHE_KEY, MODEL_SHA256, MODEL_URL } from './model-config';
import type { AnalysisResult } from './types';

let sessionPromise: Promise<ort.InferenceSession> | undefined;
let backend = 'initializing';

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getModelBytes(): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE);
  const cached = await cache.match(MODEL_CACHE_KEY);
  if (cached) return cached.arrayBuffer();

  const response = await fetch(MODEL_URL, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`Model download failed (${response.status})`);
  const bytes = await response.arrayBuffer();
  const checksum = await sha256(bytes);
  if (checksum !== MODEL_SHA256) throw new Error('Model checksum verification failed');
  await cache.put(MODEL_CACHE_KEY, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }));
  await chrome.storage.local.set({ modelReady: true, modelBytes: bytes.byteLength });
  return bytes;
}

async function createSession(): Promise<ort.InferenceSession> {
  ort.env.wasm.wasmPaths = chrome.runtime.getURL('wasm/');
  ort.env.wasm.numThreads = 1;
  const bytes = await getModelBytes();
  const providers: ort.InferenceSession.ExecutionProviderConfig[] = [];
  if ('gpu' in navigator) providers.push('webgpu');
  providers.push('wasm');
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: providers,
    graphOptimizationLevel: 'all'
  });
  backend = providers[0] === 'webgpu' ? 'WebGPU' : 'WebAssembly';
  return session;
}

async function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= createSession().catch((error) => {
    sessionPromise = undefined;
    throw error;
  });
  return sessionPromise;
}

async function imageTensor(url: string): Promise<ort.Tensor> {
  const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`Image fetch failed (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const rgba = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
    return new ort.Tensor('float32', rgbaToChw(rgba), [1, 3, INPUT_SIZE, INPUT_SIZE]);
  } finally {
    bitmap.close();
  }
}

async function analyze(requestId: string, url: string): Promise<AnalysisResult> {
  const started = performance.now();
  try {
    const [session, tensor] = await Promise.all([getSession(), imageTensor(url)]);
    const inputName = session.inputNames[0];
    if (!inputName) throw new Error('Model has no input');
    const outputs = await session.run({ [inputName]: tensor });
    const outputName = session.outputNames[0];
    const raw = outputName ? Number(outputs[outputName]?.data[0]) : Number.NaN;
    if (!Number.isFinite(raw)) throw new Error('Model returned an invalid score');
    const scores = calibrateAiConfidence(raw);
    return {
      requestId,
      verdict: verdictFor(scores.aiConfidence),
      aiConfidence: scores.aiConfidence,
      realProbability: scores.realProbability,
      inferenceMs: performance.now() - started,
      backend
    };
  } catch (error) {
    return {
      requestId,
      verdict: 'error',
      aiConfidence: 0,
      realProbability: 0,
      inferenceMs: performance.now() - started,
      backend,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'offscreen') return false;
  if (message.type === 'analyze') {
    void analyze(message.requestId, message.url).then(sendResponse);
    return true;
  }
  if (message.type === 'prepare-model') {
    void getSession().then(
      () => sendResponse({ ok: true, backend }),
      (error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
    );
    return true;
  }
  return false;
});

