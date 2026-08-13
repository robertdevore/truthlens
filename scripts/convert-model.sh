#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/.model-build"
MODEL_REV="fefa013737a0c3477961d36ee8dbbdc751352366"
mkdir -p "$WORK"
test -s "$WORK/model.safetensors" || curl -fL "https://huggingface.co/wkaandemir/ai-image-detector/resolve/$MODEL_REV/model.safetensors" -o "$WORK/model.safetensors"
test -s "$WORK/config.json" || curl -fL "https://huggingface.co/wkaandemir/ai-image-detector/raw/$MODEL_REV/config.json" -o "$WORK/config.json"
python3 -m venv "$WORK/venv"
"$WORK/venv/bin/pip" install --quiet 'numpy<2' 'torch==2.2.0' 'torchvision==0.17.0' 'timm==1.0.19' 'safetensors==0.6.2' 'onnx==1.17.0'
"$WORK/venv/bin/python" "$ROOT/scripts/export_model.py"
shasum -a 256 "$WORK/detector.onnx"
