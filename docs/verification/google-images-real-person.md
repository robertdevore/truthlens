# Google Images verification: `real person`

Date: 2026-08-13

## Result

Google returned its automated-traffic reCAPTCHA interstitial in both a clean extension-enabled Chromium profile and the in-app browser. No result thumbnails were exposed, so there were zero eligible images and zero TruthLens verdicts to record. The CAPTCHA was not bypassed.

## Deterministic visual verification

The same overlay contract was exercised through Kujo Lens against `tests/fixtures/overlay.html` at desktop and mobile viewports:

- AI verdict: image blurred, red `AI · 97%` badge centered over the image.
- Real verdict: image remains clear, green `4% AI` badge in the corner.
- Lens: PASS, 6/6 Spec assertions, zero errors, zero accessibility violations.

An extension-enabled Chromium smoke test also ran the real ONNX model against the publisher examples:

- Publisher AI example: `ai`, 100% confidence, blur present, centered `AI · 100%` badge.
- Publisher real example: `real`, 1% AI confidence, no blur, corner badge.

Evidence: [`extension-overlay-end-to-end.png`](extension-overlay-end-to-end.png)

Generated Lens evidence is intentionally ignored under `.lens/runs/`; rerun it with:

```bash
cd /Users/robertdevore/2026/Kujolang/kujo-repos/lens
./lens check http://127.0.0.1:8777/tests/fixtures/overlay.html \
  --spec /Users/robertdevore/2026/Kujolang/kujo-repos/truthlens/tests/fixtures/overlay.lens.json \
  --viewport desktop --viewport mobile --accessibility --perf --html --fail-on error
```

The Google acceptance criterion remains externally blocked until Google permits a normal result page or a human completes the CAPTCHA in a connected Chrome session.
