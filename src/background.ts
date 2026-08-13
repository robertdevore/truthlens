import { MODEL_BYTES } from './model-config';

let creatingOffscreen: Promise<void> | undefined;

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'background') return false;
  void ensureOffscreen()
    .then(() => chrome.runtime.sendMessage({ ...message, target: 'offscreen' }))
    .then(async (response) => {
      if (response?.verdict !== 'error' && response?.ok !== false) {
        await chrome.storage.local.set({ modelReady: true, modelBytes: MODEL_BYTES });
      }
      sendResponse(response);
    })
    .catch((error) => sendResponse({
      requestId: message.requestId,
      verdict: 'error',
      error: error instanceof Error ? error.message : String(error)
    }));
  return true;
});
