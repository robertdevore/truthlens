import { DEFAULT_SETTINGS, type Settings } from './types';

const status = document.querySelector<HTMLElement>('#status');
const prepare = document.querySelector<HTMLButtonElement>('#prepare');

async function refresh(): Promise<void> {
  const state = await chrome.storage.local.get(['modelReady', 'modelBytes']);
  if (status) status.textContent = state.modelReady
    ? `Ready offline · ${Math.round((Number(state.modelBytes) || 0) / 1024 / 1024)} MB model cached`
    : 'Model not installed';
}

prepare?.addEventListener('click', async () => {
  prepare.disabled = true;
  if (status) status.textContent = 'Downloading and preparing the local model…';
  const result = await chrome.runtime.sendMessage({ target: 'background', type: 'prepare-model' });
  if (status) status.textContent = result?.ok ? `Ready offline · ${result.backend}` : `Setup failed: ${result?.error ?? 'unknown error'}`;
  prepare.disabled = false;
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

