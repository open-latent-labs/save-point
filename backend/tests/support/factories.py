# 테스트 객체/데이터 빌더 (코드).
# ※ 정적 데이터 파일(샘플 PDF, 골든 응답 JSON 등)은 tests/fixtures/ 에 두고,
#   여기서는 그 파일을 로드/가공하는 함수만 작성한다.
#   예) def load_sample_pdf() -> Path: return FIXTURES_DIR / "sample.pdf"
#
# from pathlib import Path
# FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"