from pathlib import Path
import json
import torch
import timm
from safetensors.torch import load_file

root = Path(__file__).resolve().parents[1]
work = root / '.model-build'
config = json.loads((work / 'config.json').read_text())
model = timm.create_model(config['backbone'], pretrained=False, num_classes=1, img_size=config['image_size'])
missing, unexpected = model.load_state_dict(load_file(str(work / 'model.safetensors')), strict=False)
if missing or unexpected:
    raise RuntimeError(f'Weight mismatch: missing={missing}, unexpected={unexpected}')
model.eval()
sample = torch.zeros(1, 3, config['image_size'], config['image_size'])
with torch.no_grad():
    torch.onnx.export(model, sample, work / 'detector.onnx', input_names=['pixel_values'], output_names=['logits'], opset_version=18)
print(work / 'detector.onnx')
