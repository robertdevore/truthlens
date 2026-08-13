"""Evaluate the release ONNX model on a fixed, balanced public benchmark sample."""

from __future__ import annotations

import argparse
import io
import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

import numpy as np
import onnxruntime as ort
from PIL import Image

DATASET = "TheKernel01/AIGC-Detection-Benchmark"
REVISION = "c91d9024a5a77ef06e2ec681b53f9caf08675663"
OFFSETS = [0, 10420, 20840, 31260, 41680, 52100, 62520, 72940, 83360, 93780]
AI_BOUNDARY = 0.08231209963560104
MEAN = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)[:, None, None]
STD = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)[:, None, None]


def get_json(url: str) -> dict:
    with urlopen(url, timeout=90) as response:
        return json.load(response)


def load_rows(cache: Path) -> list[dict]:
    manifest = cache / "manifest.json"
    if manifest.exists():
        rows = json.loads(manifest.read_text())
        if all((cache / f"{item['row_idx']}.img").exists() for item in rows):
            return rows
    rows: list[dict] = []
    for offset in OFFSETS:
        query = urlencode({"dataset": DATASET, "config": "default", "split": "test", "offset": offset, "length": 100})
        page = get_json(f"https://datasets-server.huggingface.co/rows?{query}")
        rows.extend(page["rows"])
        time.sleep(1)
    manifest.write_text(json.dumps(rows))
    return rows


def image_path(cache: Path, item: dict) -> Path:
    path = cache / f"{item['row_idx']}.img"
    if not path.exists():
        with urlopen(item["row"]["image"]["src"], timeout=90) as response:
            path.write_bytes(response.read())
    return path


def preprocess(path: Path, degraded: bool) -> np.ndarray:
    image = Image.open(path).convert("RGB")
    if degraded:
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        image.save(encoded, "JPEG", quality=90, optimize=True)
        image = Image.open(io.BytesIO(encoded.getvalue())).convert("RGB")
    width, height = image.size
    scale = 288 / min(width, height)
    resized = image.resize((round(width * scale), round(height * scale)), Image.Resampling.BILINEAR)
    left = (resized.width - 256) // 2
    top = (resized.height - 256) // 2
    image = resized.crop((left, top, left + 256, top + 256))
    pixels = np.asarray(image, dtype=np.float32).transpose(2, 0, 1) / 255
    return (pixels - MEAN) / STD


def metrics(scores: np.ndarray, labels: np.ndarray, indices: np.ndarray) -> dict[str, float]:
    predicted = scores[indices] >= AI_BOUNDARY
    expected = labels[indices]
    ai_recall = float(predicted[expected == 1].mean())
    real_recall = float((~predicted[expected == 0]).mean())
    return {"balanced_accuracy": (ai_recall + real_recall) / 2, "ai_recall": ai_recall, "real_recall": real_recall}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=".model-build/detector.onnx")
    parser.add_argument("--cache", default=".benchmark-cache")
    parser.add_argument("--degraded", action="store_true")
    args = parser.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)
    rows = load_rows(cache)
    labels = np.asarray([item.get("row", item)["label"] for item in rows])
    session = ort.InferenceSession(args.model, providers=["CPUExecutionProvider"])
    scores: list[float] = []
    for start in range(0, len(rows), 32):
        batch = np.stack([preprocess(image_path(cache, item), args.degraded) for item in rows[start:start + 32]])
        logits = session.run(None, {session.get_inputs()[0].name: batch})[0]
        logits -= logits.max(axis=1, keepdims=True)
        probabilities = np.exp(logits)
        scores.extend((probabilities[:, 1] / probabilities.sum(axis=1)).tolist())
    values = np.asarray(scores)
    report = {
        "dataset": DATASET,
        "revision": REVISION,
        "sample_size": len(rows),
        "ai_boundary_mapped_to_65_percent": AI_BOUNDARY,
        "calibration_half": metrics(values, labels, np.arange(0, 500)),
        "held_out_half": metrics(values, labels, np.arange(500, 1000)),
        "all": metrics(values, labels, np.arange(1000)),
        "degraded": args.degraded,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
