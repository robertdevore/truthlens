import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'dist');
const required = [
  'manifest.json', 'background.js', 'content.js', 'content.css', 'offscreen.html', 'offscreen.js',
  'popup.html', 'setup.html', 'ui.js', 'ui.css',
  'wasm/ort-wasm-simd-threaded.asyncify.mjs', 'wasm/ort-wasm-simd-threaded.asyncify.wasm',
  'wasm/ort-wasm-simd-threaded.jsep.mjs', 'wasm/ort-wasm-simd-threaded.jsep.wasm',
  'wasm/ort-wasm-simd-threaded.jspi.mjs', 'wasm/ort-wasm-simd-threaded.jspi.wasm',
  'wasm/ort-wasm-simd-threaded.mjs', 'wasm/ort-wasm-simd-threaded.wasm'
];
for (const file of required) await access(resolve(root, file));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Build is not Manifest V3');
if (!manifest.permissions.includes('offscreen')) throw new Error('Missing offscreen permission');
for (const file of required) {
  const size = (await stat(resolve(root, file))).size;
  if (size === 0) throw new Error(`${file} is empty`);
}
console.log(`Verified Manifest V3 distribution (${required.length} required files).`);
