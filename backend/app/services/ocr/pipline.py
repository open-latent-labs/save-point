from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from pathlib import Path

from PIL import Image

from app.schemas.extraction import DocumentExtractionResult, ExtractionMethod, PageResult
from app.services.ocr.extractor import (
    extract_pdf_pages,
    extract_pptx_native_text,
    render_pptx_pages,
)
from app.services.ocr.preprocessor import preprocess_text
from app.services.ocr.quality import QUALITY_THRESHOLD, score_text

logger = logging.getLogger(__name__)


def _available_vram_gb() -> float:
    try:
        import pynvml

        pynvml.nvmlInit()
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            free = pynvml.nvmlDeviceGetMemoryInfo(handle).free
            return free / (1024 ** 3)
        finally:
            pynvml.nvmlShutdown()
    except ImportError:
        pass
    except Exception as e:
        logger.debug("NVML 조회 실패: %s", e)

    try:
        import torch

        if torch.cuda.is_available():
            free, _ = torch.cuda.mem_get_info(0)
            return free / (1024 ** 3)
    except Exception as e:
        logger.debug("Torch CUDA 조회 실패: %s", e)

    return 0.0


def _ocr_page(image: Image.Image, use_surya: bool) -> tuple[str, ExtractionMethod]:
    if use_surya:
        from app.services.ocr.engines.surya import run_surya_ocr
        return run_surya_ocr(image), ExtractionMethod.SURYA
    from app.services.ocr.engines.paddle import run_paddle_ocr
    return run_paddle_ocr(image), ExtractionMethod.PADDLE


def extract_document(
    file_path: str,
    layout_important: bool = False,
) -> DocumentExtractionResult:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        raw_pages = extract_pdf_pages(file_path)
        native_texts: list[str]            = [t          for t, _, _,  _  in raw_pages]
        page_images: list[Image.Image | None] = [img      for _, img, _, _  in raw_pages]
        image_ratios: list[float]          = [ir         for _, _, ir, _   in raw_pages]
        block_counts: list[int]            = [bc         for _, _, _,  bc  in raw_pages]
    elif ext == ".pptx":
        pptx_data = extract_pptx_native_text(file_path)
        native_texts  = [t  for t,  _,  _ in pptx_data]
        image_ratios  = [ir for _,  ir, _ in pptx_data]
        block_counts  = [bc for _,  _,  bc in pptx_data]
        page_images   = [None] * len(native_texts)
    else:
        raise ValueError(f"지원하지 않는 파일 형식: {ext!r}. 지원 형식: .pdf, .pptx")

    low_quality_indices = [
        i for i, (text, ir, bc) in enumerate(zip(native_texts, image_ratios, block_counts))
        if score_text(text, image_ratio=ir, block_count=bc) < QUALITY_THRESHOLD
    ]

    use_surya = False
    if low_quality_indices:
        vram_gb = _available_vram_gb()
        use_surya = vram_gb >= 6.0 and layout_important
        logger.debug(
            "OCR fallback: %d 페이지가 임계값 미달. "
            "여유 VRAM=%.1f GB, layout_important=%s → 엔진=%s",
            len(low_quality_indices),
            vram_gb,
            layout_important,
            "surya" if use_surya else "paddle",
        )

        if ext == ".pptx":
            try:
                rendered = render_pptx_pages(file_path)
                for i, img in enumerate(rendered):
                    if i < len(page_images):
                        page_images[i] = img
            except RuntimeError as exc:
                logger.warning("PPTX 이미지 렌더링 실패, pptx-python 원본 추출 텍스트로 대체합니다: %s", exc)

    results: list[PageResult] = []
    for i, (text, image, ir, bc) in enumerate(
        zip(native_texts, page_images, image_ratios, block_counts)
    ):
        quality = score_text(text, image_ratio=ir, block_count=bc)

        if quality >= QUALITY_THRESHOLD or image is None:
            results.append(PageResult(
                page_number=i + 1,
                text=preprocess_text(text),
                method=ExtractionMethod.NATIVE,
                quality_score=quality,
            ))
            continue

        ocr_text, method = _ocr_page(image, use_surya=use_surya)
        cleaned = preprocess_text(ocr_text)
        results.append(PageResult(
            page_number=i + 1,
            text=cleaned,
            method=method,
            quality_score=score_text(ocr_text),
        ))

    return DocumentExtractionResult(file_path=file_path, pages=results)


async def run_ocr(file_bytes: bytes, extension: str) -> DocumentExtractionResult:
    """bytes → 임시 파일 → extract_document (스레드 풀) → 파일 정리."""
    suffix = extension if extension.startswith(".") else f".{extension}"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        return await asyncio.to_thread(extract_document, tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
