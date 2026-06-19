from __future__ import annotations

import os
import subprocess
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL.Image import Image


def _is_cuda_available() -> bool:
    try:
        result = subprocess.run(["nvidia-smi"], capture_output=True, timeout=3)
        return result.returncode == 0
    except Exception:
        return False


if not _is_cuda_available():
    os.environ.setdefault("FLAGS_use_mkldnn", "0")
    os.environ.setdefault("FLAGS_enable_pir_api", "0")

_paddle_ocr = None


def _get_ocr():
    global _paddle_ocr

    if _paddle_ocr is None:
        from paddleocr import PaddleOCR

        _paddle_ocr = PaddleOCR(
            lang="en",
            use_doc_orientation_classify=True,
            use_textline_orientation=True,
        )

    return _paddle_ocr


def run_paddle_ocr(image: "Image") -> str:
    import numpy as np

    result = _get_ocr().predict(np.array(image))

    texts = []

    for page in result:
        for item in page.get("rec_texts", []):
            texts.append(item)

    return "\n".join(texts)
