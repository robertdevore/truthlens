# Public benchmark verification: detector v2

Date: 2026-08-13

## Selection protocol

The evaluation uses 1,000 balanced rows from revision `c91d9024a5a77ef06e2ec681b53f9caf08675663` of `TheKernel01/AIGC-Detection-Benchmark`. Ten fixed, evenly spaced pages contribute 50 real and 50 generated images each. Images are constrained to 512 px and JPEG-encoded at quality 90 to simulate web thumbnails. The first 500 images select the raw model boundary that maps to TruthLens's required 65% AI-confidence threshold. The second 500 remain untouched until the boundary is fixed.

## Results

| Runtime | Evaluation | Balanced accuracy | AI recall | Real recall |
|---|---:|---:|---:|---:|
| Python ONNX | calibration 500 | 78.4% | 74.8% | 82.0% |
| Python ONNX | held-out 500 | **80.0%** | 75.6% | 84.4% |
| Python ONNX | all 1,000 at fixed boundary | **79.2%** | 75.2% | 83.2% |
| Chrome extension | calibration 500 | 75.4% | 69.6% | 81.2% |
| Chrome extension | held-out 500 | **79.2%** | 72.4% | 86.0% |
| Chrome extension | all 1,000 at fixed boundary | **77.3%** | 71.0% | 83.6% |

The actual Chrome extension clears the bounty's 75% balanced-accuracy bar on the held-out half by 4.2 percentage points. The later phase-two checkpoint reached only 71.8% in the Python protocol and was rejected. This public sample cannot prove performance on the private contest benchmark, and its underlying sources may overlap with datasets known to the model publisher.

## Browser performance and invariants

The released float32 ONNX graph has a dynamic batch dimension. TruthLens pipelines and batches up to four visible images while keeping GPU runs serialized. In a clean-profile Chromium test using the published release asset and a warm WebGPU session, four visible publisher examples received verdicts in 955 ms. Both generated examples were above the 65% AI threshold and both real examples remained unblurred below it. The full 1,000-image browser run completed inference in 162.1 seconds (6.2 images/second); that throughput figure includes extension messaging, image fetch, decode, preprocessing, and overlay work.

Inference remains entirely inside Chrome. The model is downloaded once, SHA-256 verified, cached for offline use, and never supplemented by another runtime model or external inference service.
