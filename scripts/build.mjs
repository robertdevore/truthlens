import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
await mkdir(dist, { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ['src/background.ts', 'src/content.ts', 'src/offscreen.ts', 'src/ui.ts'],
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  minify: true,
  sourcemap: false,
  target: 'chrome121',
  legalComments: 'none'
});
for (const file of ['manifest.json', 'popup.html', 'setup.html', 'offscreen.html']) await cp(resolve(root, file), resolve(dist, file));
await cp(resolve(root, 'src/content.css'), resolve(dist, 'content.css'));
await cp(resolve(root, 'src/ui.css'), resolve(dist, 'ui.css'));
await mkdir(resolve(dist, 'wasm'), { recursive: true });
const wasmArtifacts = [
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jspi.mjs',
  'ort-wasm-simd-threaded.jspi.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm'
];
for (const file of wasmArtifacts) {
  await cp(resolve(root, 'node_modules/onnxruntime-web/dist', file), resolve(dist, 'wasm', file));
}
const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.json'), 'utf8'));
manifest.version = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version;
await writeFile(resolve(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
