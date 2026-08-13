# TruthLens

TruthLens is an open-source Manifest V3 Chrome extension that automatically estimates whether images on ordinary webpages were AI-generated. The image bytes and inference results never leave Chrome: inference runs in an extension-owned offscreen document with ONNX Runtime Web, using WebGPU when available and WebAssembly as a fallback.

Every analyzed image receives an **AI confidence score**. Scores at or above **65%** are marked AI, scores at or below 35% are marked real, and the middle band is explicitly uncertain.

Likely AI images are blurred and receive a centered red `AI · confidence` badge. Real and uncertain images remain unobscured, with compact corner scores.

## Why this detector

The model is a CLIP ViT-B/16 forensic classifier fine-tuned on approximately 20,000 balanced samples that include Stable Diffusion, Midjourney, DALL·E, Flux, GPT Image, and real public-domain/CC0 photographs. Its publisher reports 95.9% accuracy, 95.9% macro F1, and 0.994 ROC-AUC on a held-out test split. Those are source-model results, not a claim about the bounty's private benchmark; detector accuracy can shift substantially across datasets and future generators.

TruthLens maps the model's published, temperature-calibrated fake/real boundaries onto the challenge's required 65% confidence convention. The mapping is monotonic and covered by unit tests.

## Performance

- The model session is prepared once, warmed up during setup, and restored proactively at Chrome startup.
- Image decoding happens while the model loads, while GPU inference is serialized to avoid WebGPU contention and memory spikes on image-heavy pages.
- Duplicate requests are coalesced. Successful results use a bounded 10-minute in-memory LRU cache, so repeated image URLs are labeled without another model run.
- Tensor and GPU output resources are released immediately after each inference.

On the included smoke samples, a warm WebGPU inference completes in roughly one second on an Apple Silicon development machine; a repeated cached image returns from the extension in effectively zero inference time. Hardware and Chrome GPU support determine actual latency.

## Privacy and offline behavior

- Webpage images are fetched only by the extension and decoded in memory.
- Image pixels, URLs, predictions, and telemetry are never sent to a service.
- The public ONNX model is downloaded once from this repository's GitHub release, verified against a pinned SHA-256 digest, and stored in Chrome's Cache Storage.
- After setup, inference works with internet access disabled.
- There is no localhost server, native host, Python runtime, Node.js runtime, cloud inference, or external API at runtime.

The broad host permission is required so the extension page can read cross-origin images shown by websites. It is not used for browsing-history collection or uploads.

## Install from a release

1. Download `truthlens-extension.zip` from the latest GitHub release and unzip it.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped directory.
5. On the setup page that opens, click **Download and install model** while internet access is available.
6. Wait for **Ready offline**, then browse normally. Images at least 128 × 128 pixels are labeled automatically.

To prove offline operation, finish step 5, disable networking, restart Chrome, and revisit pages whose images are locally available or load an HTML page containing local/data-URL images.

## Reproducible source build

Prerequisites: Node.js 20+, npm 10+, Chrome 121+, and standard Unix tools. Runtime users do not need Python. Model maintainers need Python 3.10 only when reproducing the ONNX conversion.

```bash
git clone https://github.com/robertdevore/truthlens.git
cd truthlens
npm ci
npm run check
npm run package
```

The unpacked extension is written to `dist/`; the release archive is `truthlens-extension.zip`. `npm run check` runs strict TypeScript checks, lint, unit tests, a production build, and a Manifest V3 artifact audit.

Load `dist/` through `chrome://extensions` for development.

## Reproduce the model artifact

The runtime artifact is derived from the MIT-licensed [`wkaandemir/ai-image-detector`](https://huggingface.co/wkaandemir/ai-image-detector) revision `fefa013737a0c3477961d36ee8dbbdc751352366`. The conversion script pins every Python dependency and downloads the original safetensors and config from that immutable revision.

```bash
npm run model:convert
shasum -a 256 .model-build/detector.onnx
```

Expected digest:

```text
40307788bb92ef5bfc6bcefa3df8442a0b47feb4467b5f6625194eabe58e1945
```

The expected digest is compiled into the extension. A mismatch prevents the model from being cached or executed.

## Architecture

1. The content script discovers visible and newly inserted `<img>` elements with `IntersectionObserver` and `MutationObserver`.
2. The MV3 service worker owns message routing and creates one offscreen inference document.
3. The offscreen document fetches image bytes using extension host permission, resizes to 256 × 256 RGB, applies the model's published CLIP normalization, and produces a one-logit result.
4. A monotonic calibration maps the source model's decision interval (`p(real)` 0.91–0.93) to an AI-confidence interval of 65%–35%.
5. The content script overlays the confidence score without modifying the image bytes.

Model download and image fetch are separate: only the model download goes to this project's release URL. Webpage images are read directly from the URL the page already displays.

## Verification

```bash
npm test                 # score/preprocessing unit tests
npm run check            # complete deterministic quality gate
npm run package          # reproducible extension archive
```

A Kujo Spec contract is stored in `specs/truthlens.spec.yml`; deterministic release checks are stored in `eval.json`. The publisher's 95.9% held-out result establishes the model-selection target, but only the bounty maintainer can measure performance on its private benchmark.

## Limitations

AI-image detection is probabilistic, generator-dependent, and vulnerable to distribution shift, compression, editing, screenshots, and adversarial evasion. A score is not proof of authorship or deception. Small images are skipped by default because resampling destroys useful forensic detail. Canvas-only drawings, CSS backgrounds, videos, and browser-protected pages are outside the current scan surface.

## License and attribution

Extension source is MIT licensed. ONNX Runtime Web is MIT licensed. The detector weights are MIT licensed by their publisher; the backbone is based on OpenAI CLIP. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for precise provenance.
