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
    render_pdf_pages,
    render_pptx_pages,
)
from app.services.ocr.preprocessor import preprocess_text
from app.services.ocr.quality import (
    aggregate_confidence,
    is_layout_important,
    needs_ocr,
    text_readability,
)

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


def _ocr_page(
    image: Image.Image, use_surya: bool
) -> tuple[str, list[float], ExtractionMethod]:
    if use_surya:
        from app.services.ocr.engines.surya import run_surya_ocr
        text, scores = run_surya_ocr(image)
        return text, scores, ExtractionMethod.SURYA
    from app.services.ocr.engines.paddle import run_paddle_ocr
    text, scores = run_paddle_ocr(image)
    return text, scores, ExtractionMethod.PADDLE


def extract_document(
    file_path: str,
    layout_important: bool | None = None,
) -> DocumentExtractionResult:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        raw_pages = extract_pdf_pages(file_path)
        native_texts: list[str]   = [t  for t,  _,  _ in raw_pages]
        image_ratios: list[float] = [ir for _,  ir, _ in raw_pages]
        block_counts: list[int]   = [bc for _,  _,  bc in raw_pages]
    elif ext == ".pptx":
        pptx_data = extract_pptx_native_text(file_path)
        native_texts  = [t  for t,  _,  _ in pptx_data]
        image_ratios  = [ir for _,  ir, _ in pptx_data]
        block_counts  = [bc for _,  _,  bc in pptx_data]
    else:
        raise ValueError(f"지원하지 않는 파일 형식: {ext!r}. 지원 형식: .pdf, .pptx")

    # 렌더링은 OCR이 필요한 페이지만 (아래에서 인덱스 확정 후 채운다)
    page_images: list[Image.Image | None] = [None] * len(native_texts)

    ocr_needed_indices = [
        i for i, (text, ir, bc) in enumerate(zip(native_texts, image_ratios, block_counts))
        if needs_ocr(text, image_ratio=ir, block_count=bc)
    ]

    use_surya = False
    if ocr_needed_indices:
        if layout_important is None:
            layout_important = is_layout_important(image_ratios)
        vram_gb = _available_vram_gb()
        use_surya = vram_gb >= 6.0 and layout_important
        logger.debug(
            "OCR fallback: %d 페이지가 OCR 필요. "
            "여유 VRAM=%.1f GB, layout_important=%s → 엔진=%s",
            len(ocr_needed_indices),
            vram_gb,
            layout_important,
            "surya" if use_surya else "paddle",
        )

        # OCR 필요 페이지만 렌더링
        needed = set(ocr_needed_indices)
        if ext == ".pdf":
            for i, img in render_pdf_pages(file_path, needed).items():
                page_images[i] = img
        else:  # pptx
            try:
                for i, img in render_pptx_pages(file_path, needed).items():
                    page_images[i] = img
            except RuntimeError as exc:
                logger.warning("PPTX 이미지 렌더링 실패, pptx-python 원본 추출 텍스트로 대체합니다: %s", exc)

    results: list[PageResult] = []
    for i, (text, image, ir, bc) in enumerate(
        zip(native_texts, page_images, image_ratios, block_counts)
    ):
        # 네이티브 텍스트로 충분하거나(빈 페이지 포함) 렌더 이미지가 없으면 OCR 스킵
        if image is None or not needs_ocr(text, image_ratio=ir, block_count=bc):
            results.append(PageResult(
                page_number=i + 1,
                text=preprocess_text(text),
                method=ExtractionMethod.NATIVE,
                quality_score=text_readability(text),
            ))
            continue

        ocr_text, scores, method = _ocr_page(image, use_surya=use_surya)
        cleaned = preprocess_text(ocr_text)

        # OCR 신뢰도 = 엔진 confidence 와 판독성 중 낮은 쪽 (엔진의 과신 방지)
        confidence = aggregate_confidence(scores, ocr_text.split("\n"))
        readability = text_readability(ocr_text)
        results.append(PageResult(
            page_number=i + 1,
            text=cleaned,
            method=method,
            quality_score=round(min(confidence, readability), 3),
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
