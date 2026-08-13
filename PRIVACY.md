# Privacy policy

TruthLens performs image inference locally in Google Chrome.

It does not collect, transmit, sell, or retain browsing history, webpage image data, image URLs, inference results, personal information, or analytics. Webpage images are fetched directly from the locations already referenced by the page and decoded in extension memory. No image is routed through a developer-controlled server.

During one-time setup, the extension downloads a public ONNX model from the project's GitHub release. It verifies the file's SHA-256 checksum and saves it in Chrome Cache Storage for offline inference. Settings and a model-ready flag are stored through Chrome's local/sync storage APIs.

The `<all_urls>` host permission is used only to discover webpage images and allow the extension-owned inference document to read cross-origin image bytes. TruthLens contains no cloud inference, external API, advertising, tracking, or localhost dependency.

