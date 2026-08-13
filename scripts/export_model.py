from pathlib import Path

import onnx
import timm
import torch

root = Path(__file__).resolve().parents[1]
work = root / ".model-build"
checkpoint = torch.load(work / "checkpoint_phase1.pth", map_location="cpu", weights_only=False)
model = timm.create_model("convnextv2_base", pretrained=False, num_classes=2)
model.load_state_dict(checkpoint["model"])
model.eval()

output = work / "detector.onnx"
torch.onnx.export(
    model,
    torch.zeros(1, 3, 256, 256),
    output,
    input_names=["pixel_values"],
    output_names=["logits"],
    dynamic_axes={"pixel_values": {0: "batch_size"}, "logits": {0: "batch_size"}},
    opset_version=17,
)
onnx.checker.check_model(output)
print(output)
