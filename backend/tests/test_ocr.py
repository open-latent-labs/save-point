import pytest
from unittest.mock import patch, MagicMock
from app.services.ocr_service import extract_text_from_pdf


def test_extract_text_file_not_found():
    with pytest.raises(FileNotFoundError):
        extract_text_from_pdf("/nonexistent/path.pdf")
