from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL.Image import Image

# Module-level cache so models are loaded only once per process
_models: dict = {}


def _load_models() -> dict:
    if not _models:
        from surya.model.detection.segformer import (
            load_model as load_det_model,
            load_processor as load_det_processor,
        )
        from surya.model.recognition.model import load_model as load_rec_model
        from surya.model.recognition.processor import load_processor as load_rec_processor

        _models.update({
            "det_model": load_det_model(),
            "det_processor": load_det_processor(),
            "rec_model": load_rec_model(),
            "rec_processor": load_rec_processor(),
        })
    return _models


def run_surya_ocr(image: "Image") -> str:
    from surya.ocr import run_ocr

    models = _load_models()
    results = run_ocr(
        [image],
        [["ko", "en"]],
        models["det_model"],
        models["det_processor"],
        models["rec_model"],
        models["rec_processor"],
    )
    if not results:
        return ""
    return "\n".join(line.text for line in results[0].text_lines)
