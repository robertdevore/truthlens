import { MODEL_BYTES } from './model-config';
import { errorMessage } from './runtime';

let creatingOffscreen: Promise<void> | undefined;
let modelReadyPersisted = false;
let modelReadyWrite: Promise<void> | undefined;

async function ensureOffscreen(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [offscreenUrl] });
  if (contexts.length > 0) return;
  creatingOffscreen ??= chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Run private ONNX image inference in a persistent browser document.'
  }).finally(() => { creatingOffscreen = undefined; });
  await creatingOffscreen;
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.storage.local.get('modelReady').then(({ modelReady }) => {
    if (!modelReady) return;
    modelReadyPersisted = true;
    return ensureOffscreen().then(() => chrome.runtime.sendMessage({ target: 'offscreen', type: 'prepare-model' }));
  });
});

async function persistModelReady(): Promise<void> {
  if (modelReadyPersisted) return;
  modelReadyWrite ??= chrome.storage.local.set({ modelReady: true, modelBytes: MODEL_BYTES })
    .then(() => { modelReadyPersisted = true; })
    .finally(() => { modelReadyWrite = undefined; });
  await modelReadyWrite;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'background') return false;
  void ensureOffscreen()
    .then(() => chrome.runtime.sendMessage({ ...message, target: 'offscreen' }))
    .then(async (response) => {
      if (response?.verdict !== 'error' && response?.ok !== false) {
        await persistModelReady();
      }
      sendResponse(response);
    })
    .catch((error) => sendResponse({
      requestId: message.requestId,
      verdict: 'error',
      error: errorMessage(error)
    }));
  return true;
});
