# Viewport-priority verification

Date: 2026-08-13

## Result

TruthLens v1.4.0 prioritizes visible thumbnails, bounds content-script work to two active analysis requests, and waits to enqueue below-fold images until they enter a 100 px viewport margin. Persistent load handling covers delayed and lazy-loaded image URLs.

An extension-enabled Chromium smoke test used the real pinned ONNX model against two delayed-load publisher examples above the fold and the same pair below the fold:

- Both visible verdicts completed in 972 ms.
- Before scrolling, neither below-fold image had a verdict.
- After scrolling, both below-fold images received verdicts.
- Publisher AI example: `ai`, 100% AI confidence.
- Publisher real examples: `real`, 1.19% and 1.06% AI confidence.

Evidence: [`viewport-priority-before-scroll.png`](viewport-priority-before-scroll.png)

## Quality and privacy invariants

The model input has a fixed `[1, 3, 256, 256]` batch shape, so true multi-image inference would require replacing or re-exporting the model. This release instead pipelines fetch/preprocessing without altering the model artifact, preprocessing, calibration, inference output, local cache, or verdict thresholds. Image pixels and predictions remain local to the extension.

The deterministic quality gate passed all nine unit tests, strict TypeScript, ESLint, the production build, and the Manifest V3 artifact audit.
