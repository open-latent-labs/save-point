# tests/fixtures/ — 정적 테스트 데이터

여기에는 **데이터 파일**만 둡니다 (코드 X).

- 샘플 PDF (OCR integration 입력)
- 골든 응답 JSON (요약/분류 기대 출력 등)
- 기타 고정 입력 파일

코드(가짜 객체·빌더·헬퍼)는 `tests/support/` 에 둡니다.

- `tests/support/factories.py` 가 이 디렉터리의 파일을 로드합니다.
- pytest fixture 자체는 `tests/conftest.py`(공용) 또는 각 도메인 폴더에 둡니다.
