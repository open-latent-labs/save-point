from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

def extract_pdf_pages(file_path: str) -> list[tuple[str, Image.Image, float, int]]:
    doc = fitz.open(file_path)
    pages: list[tuple[str, Image.Image, float, int]] = []
    for page in doc:
        blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)

        # 텍스트 블록 수
        text_block_count = sum(1 for b in blocks if b[6] == 0)

        # 이미지 블록 면적 합산 후 페이지 면적 대비 비율 계산
        image_block_area = sum((b[2] - b[0]) * (b[3] - b[1]) for b in blocks if b[6] == 1)
        page_area = page.rect.width * page.rect.height
        image_ratio = min(image_block_area / page_area, 1.0) if page_area > 0 else 0.0

        text = page.get_text()
        pix = page.get_pixmap(dpi=150)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)        

        pages.append((text, img, image_ratio, text_block_count))
    doc.close()
    return pages


# 그룹 도형을 재귀적으로 순회하며 (텍스트 줄, 텍스트 블록 수, 이미지 면적) 집계
def _collect_shape_content(shapes) -> tuple[list[str], int, int]:
    lines: list[str] = []
    text_block_count = 0
    image_area = 0

    for shape in shapes:
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            g_lines, g_count, g_image_area = _collect_shape_content(shape.shapes)
            lines.extend(g_lines)
            text_block_count += g_count
            # 그룹 자식은 좌표계가 달라 슬라이드 면적 환산이 부정확하므로,
            # 이미지가 있으면 그룹 전체 면적으로 근사 (빈 페이지 오판 방지)
            if g_image_area > 0:
                image_area += shape.width * shape.height
            continue

        if shape.has_text_frame:
            text_block_count += 1
            for para in shape.text_frame.paragraphs:
                line = "".join(run.text for run in para.runs).strip()
                if line:
                    lines.append(line)
        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
            image_area += shape.width * shape.height

    return lines, text_block_count, image_area


def extract_pptx_native_text(file_path: str) -> list[tuple[str, float, int]]:
    prs = Presentation(file_path)
    slide_area = prs.slide_width * prs.slide_height
    results: list[tuple[str, float, int]] = []

    for slide in prs.slides:
        lines, text_block_count, image_area = _collect_shape_content(slide.shapes)
        image_ratio = min(image_area / slide_area, 1.0) if slide_area > 0 else 0.0
        results.append(("\n".join(lines), image_ratio, text_block_count))

    return results


def render_pptx_pages(file_path: str) -> list[Image.Image]:
    path = Path(file_path)
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            subprocess.run(
                [
                    "libreoffice", "--headless",
                    "--convert-to", "pdf",
                    "--outdir", tmpdir,
                    str(path),
                ],
                check=True,
                timeout=60,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except FileNotFoundError as e:
            raise RuntimeError(
                "libreoffice 를 찾을 수 없습니다. PPTX OCR fallback을 위해 LibreOffice를 설치하세요."
            ) from e
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"LibreOffice PDF 변환 실패: {e}") from e

        pdf_path = Path(tmpdir) / (path.stem + ".pdf")
        doc = fitz.open(str(pdf_path))
        images: list[Image.Image] = []
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            images.append(Image.frombytes("RGB", [pix.width, pix.height], pix.samples))
        doc.close()
    return images
