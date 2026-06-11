from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL.Image import Image

os.environ.setdefault("FLAGS_use_mkldnn", "0")


def _patch_paddleocr_disable_mkldnn() -> None:
    """PaddlePaddle 3.x + PaddleOCR 2.10.x 조합에서 OneDNN 강제 비활성화.

    PaddlePaddle 3.x는 CPU 추론 Config에서 OneDNN을 기본 활성화하지만
    PaddleOCR 2.10.x의 utility.py는 disable_mkldnn()을 호출하지 않음.
    create_predictor 진입 직전에 Config.disable_gpu()를 후킹하여 수정.
    """
    try:
        import paddleocr.tools.infer.utility as _util
        _orig_create = _util.create_predictor

        def _wrapped_create(args, mode, logger):
            from paddle import inference as _inf

            _orig_disable_gpu = _inf.Config.disable_gpu

            def _disable_gpu_and_mkldnn(self: "_inf.Config") -> None:
                _orig_disable_gpu(self)
                try:
                    self.disable_mkldnn()
                except Exception:
                    pass

            _inf.Config.disable_gpu = _disable_gpu_and_mkldnn
            try:
                return _orig_create(args, mode, logger)
            finally:
                _inf.Config.disable_gpu = _orig_disable_gpu

        _util.create_predictor = _wrapped_create
    except Exception:
        pass


_patch_paddleocr_disable_mkldnn()

_paddle_ocr = None


def _ch_det_model_dir() -> str:
    """ch_PP-OCRv4_det 경로 반환. 미존재 시 임시 초기화로 다운로드.

    Multilingual_PP-OCRv3_det는 PaddlePaddle 3.x + Windows CPU 환경에서
    fused_conv2d OneDNN 오류를 일으킴. ch_PP-OCRv4_det로 교체.
    """
    path = Path.home() / ".paddleocr/whl/det/ch/ch_PP-OCRv4_det_infer"
    if not path.exists():
        from paddleocr import PaddleOCR as _Tmp
        _Tmp(lang="ch", use_angle_cls=False, show_log=False)
    return str(path)


def _get_ocr():
    global _paddle_ocr
    if _paddle_ocr is None:
        from paddleocr import PaddleOCR
        _paddle_ocr = PaddleOCR(
            use_angle_cls=True,
            lang="korean",
            det_model_dir=_ch_det_model_dir(),
            show_log=False,
        )
    return _paddle_ocr


def run_paddle_ocr(image: "Image") -> str:
    import numpy as np

    result = _get_ocr().ocr(np.array(image), cls=True)
    if not result or not result[0]:
        return ""
    return "\n".join(line[1][0] for line in result[0])
