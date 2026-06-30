"""문서 업로드 검증 단위 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/document_service.py (validate_extension / validate_file_size / sanitize_filename)
"""
import pytest
from fastapi import HTTPException

from app.services.document_service import (
    sanitize_filename,
    validate_extension,
    validate_file_size,
)

pytestmark = pytest.mark.unit


# ── 확장자 검증: 허용 확장자면 소문자 확장자를 반환 ─────────────────────────
def test_validate_extension_allowed_returns_lower_ext():
    """대문자 .PDF도 허용되며 소문자 '.pdf'를 반환한다."""
    # Arrange / Act
    ext = validate_extension("Report.PDF")

    # Assert
    assert ext == ".pdf"


# ── 확장자 검증 엣지: 미허용 확장자는 400 ───────────────────────────────────
def test_validate_extension_disallowed_raises_400():
    """지원하지 않는 확장자는 HTTPException(400)을 던진다."""
    # Act / Assert
    with pytest.raises(HTTPException) as exc:
        validate_extension("malware.exe")

    assert exc.value.status_code == 400


# ── 파일 크기 검증 엣지: 20MB 초과는 413 ────────────────────────────────────
def test_validate_file_size_over_limit_raises_413():
    """허용 크기(20MB)를 넘는 파일은 HTTPException(413)을 던진다."""
    # Arrange: 20MB + 1바이트
    oversized = b"\x00" * (20 * 1024 * 1024 + 1)

    # Act / Assert
    with pytest.raises(HTTPException) as exc:
        validate_file_size(oversized)

    assert exc.value.status_code == 413


# ── 파일명 정규화: 위험 문자가 치환된다 ─────────────────────────────────────
def test_sanitize_filename_strips_unsafe_chars():
    """경로/위험 문자가 포함된 파일명을 안전한 이름으로 바꾼다."""
    # Arrange / Act
    safe = sanitize_filename("../../etc/pa:ss.pdf")

    # Assert: 경로 구분자가 제거된다
    assert "/" not in safe
