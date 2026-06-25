"""RDB 리포지토리 통합 테스트 [담당: 최원익] — 스타일은 tests/test_reference_sample.py 참고.
대상: RDB 스키마/리포지토리 (docs/schema.sql 기준)

외부 의존성: (선택) testcontainers PostgreSQL + schema.sql 적용.
Docker가 부담되면 이 파일은 생략 가능(플랜상 optional). 모델 매핑·제약 검증용.
"""
import pytest

pytestmark = pytest.mark.integration


# ── 스키마 적용 후 문서 1건 저장/조회가 왕복된다 ────────────────────────────
async def test_insert_and_fetch_document_roundtrips():
    """schema.sql을 올린 PG에 문서를 넣고 다시 읽으면 같은 값이 나온다."""
    pytest.skip("TODO(B): 선택 구현 — testcontainers PG 기동 + schema.sql 적용 후 활성화")
    # # Arrange: testcontainers로 PG 컨테이너 기동, docs/schema.sql 실행, 엔진/세션 생성
    # # Act: 문서 insert 후 select
    # # Assert: 저장값 == 조회값
