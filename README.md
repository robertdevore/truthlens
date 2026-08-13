# TruthLens

TruthLens is an open-source Manifest V3 Chrome extension that automatically estimates whether images on ordinary webpages were AI-generated. The image bytes and inference results never leave Chrome: inference runs in an extension-owned offscreen document with ONNX Runtime Web, using WebGPU when available and WebAssembly as a fallback.

Every analyzed image receives an **AI confidence score**. Scores at or above **65%** are marked AI, scores at or below 35% are marked real, and the middle band is explicitly uncertain.

Likely AI images are blurred and receive a centered red `AI · confidence` badge. Real and uncertain images remain unobscured, with compact corner scores.

## Why this detector

The model is the phase-one checkpoint of an MIT-licensed ConvNeXt V2 classifier trained across roughly 400,000 real photographs and generated images from modern diffusion and GAN families. Phase one outperformed the publisher's later continual-learning checkpoint on TruthLens's web-degraded validation protocol.

TruthLens selected and calibrated it on a fixed 1,000-image balanced sample from the public AIGC Detection Benchmark after resizing and JPEG recompression to simulate web thumbnails. In the actual extension runtime, the decision boundary selected on the first 500 images achieved 79.2% balanced accuracy on the untouched second 500: 72.4% AI recall and 86.0% real recall. An independent Python/ONNX run reached 80.0%. This is evidence of crossing the bounty's public target on held-out data, not a guarantee about its private benchmark; overlap and distribution shift remain possible.

## Performance

- The model session is prepared once, warmed up during setup, and restored proactively at Chrome startup.
- Visible thumbnails are prioritized by viewport coverage. Images outside a narrow prefetch margin wait until the user approaches them, and delayed/lazy-loaded images are queued as soon as they become usable.
- Up to four image fetch/preprocessing jobs are pipelined into dynamic local batches. GPU runs remain serialized to avoid contention and memory spikes.
- Duplicate requests are coalesced. Successful results use a bounded 10-minute in-memory LRU cache, so repeated image URLs are labeled without another model run.
- Tensor and GPU output resources are released immediately after each inference.
- Initial setup reports live downloaded/total megabytes and advances through integrity verification, offline caching, detector initialization, and local warm-up. Success and failure states remain visible with a retry action.

In a clean-profile, extension-enabled Chromium smoke test using the published model artifact, four visible images received correct threshold decisions in 955 ms on the development machine after setup warm-up. A repeated cached image returns in effectively zero inference time. Hardware, batch composition, Chrome GPU support, and competing system load determine actual latency.

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

The runtime artifact is derived from the MIT-licensed [`xRayon/convnext-ai-images-detector`](https://huggingface.co/xRayon/convnext-ai-images-detector) revision `1b4d270be0590cde4320fa7503d68b44bb7ee77e`. The conversion script pins every Python dependency, downloads the immutable phase-one checkpoint, and exports a dynamic-batch ONNX graph.

```bash
npm run model:convert
shasum -a 256 .model-build/detector.onnx
```

Expected digest:

```text
a7132ad643bc0cce19752e089beb9f85818891a67898ea06e0e09abeadd7f3f0
```

The expected digest is compiled into the extension. A mismatch prevents the model from being cached or executed.

## Architecture

1. The content script discovers visible and newly inserted `<img>` elements with `IntersectionObserver` and `MutationObserver`.
2. The MV3 service worker owns message routing and creates one offscreen inference document.
3. The offscreen document fetches image bytes using extension host permission, performs resize/center-crop preprocessing and ImageNet normalization, and batches up to four inputs for a two-logit result.
4. A monotonic calibration maps the public-benchmark decision boundary to the challenge's required 65% AI-confidence threshold.
5. The content script overlays the confidence score without modifying the image bytes.

Model download and image fetch are separate: only the model download goes to this project's release URL. Webpage images are read directly from the URL the page already displays.

## Verification

```bash
npm test                 # score/preprocessing unit tests
npm run check            # complete deterministic quality gate
npm run package          # reproducible extension archive
.model-build/venv/bin/python scripts/benchmark_detector.py --model .model-build/detector.onnx --degraded
```

A Kujo Spec contract is stored in `specs/truthlens.spec.yml`; deterministic release checks are stored in `eval.json`. The benchmark script uses fixed public rows and reports its calibration half separately from its untouched held-out half. Only the bounty maintainer can measure performance on its private benchmark.

## Limitations

AI-image detection is probabilistic, generator-dependent, and vulnerable to distribution shift, compression, editing, screenshots, and adversarial evasion. A score is not proof of authorship or deception. Small images are skipped by default because resampling destroys useful forensic detail. Canvas-only drawings, CSS backgrounds, videos, and browser-protected pages are outside the current scan surface.

## License and attribution

Extension source is MIT licensed. ONNX Runtime Web and the detector weights are MIT licensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for precise provenance.
