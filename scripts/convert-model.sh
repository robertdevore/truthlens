#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/.model-build"
MODEL_REV="1b4d270be0590cde4320fa7503d68b44bb7ee77e"
CHECKPOINT_URL="https://huggingface.co/xRayon/convnext-ai-images-detector/resolve/$MODEL_REV/AI%20Images%20Detector/checkpoints/checkpoint_phase1.pth"
mkdir -p "$WORK"
test -s "$WORK/checkpoint_phase1.pth" || curl -fL "$CHECKPOINT_URL" -o "$WORK/checkpoint_phase1.pth"
python3 -m venv "$WORK/venv"
"$WORK/venv/bin/pip" install --quiet 'numpy<2' 'torch==2.2.0' 'torchvision==0.17.0' 'timm==1.0.19' 'onnx==1.17.0' 'onnxruntime==1.19.2'
"$WORK/venv/bin/python" "$ROOT/scripts/export_model.py"
shasum -a 256 "$WORK/detector.onnx"
