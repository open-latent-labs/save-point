-- =============================================================
-- schema.sql
-- DB: PostgreSQL 15+
-- 참고: ULID PK는 백엔드에서 생성, BIGINT PK는 GENERATED ALWAYS AS IDENTITY
-- =============================================================

CREATE TYPE user_role        AS ENUM ('USER', 'ADMIN','SUPER_ADMIN');
CREATE TYPE user_status      AS ENUM ('ACTIVE', 'DEACTIVE');
CREATE TYPE document_status  AS ENUM ('INITIAL', 'PROCESSING', 'DONE', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE document_access  AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE doc_main_type    AS ENUM ('ENGINE_REFERENCE', 'POSTMORTEM', 'BUG_ANALYSIS', 'ARCHITECTURE', 'TUTORIAL', 'OTHER');
CREATE TYPE doc_sub_type     AS ENUM ('UNITY', 'UNREAL', 'GODOT', 'CUSTOM', 'AUTOMATION', 'OTHER');
CREATE TYPE ocr_status       AS ENUM ('PENDING', 'DONE', 'FAILED');
CREATE TYPE ocr_engine       AS ENUM ('NATIVE', 'PADDLE', 'SURYA');
CREATE TYPE job_type         AS ENUM ('OCR', 'CLASSIFY_SUMMARIZE', 'EMBED');
CREATE TYPE job_status       AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'RETRYING');
CREATE TYPE approval_action  AS ENUM ('APPROVED', 'REJECTED');
CREATE TYPE chat_role        AS ENUM ('USER', 'ASSISTANT');

CREATE TABLE users (
    id                VARCHAR(26)  NOT NULL,
    password          VARCHAR(255) NOT NULL,
    role              user_role    NOT NULL DEFAULT 'USER',        -- 회원 역할(권한 구분)
    email             VARCHAR(255) NOT NULL,
    nickname          VARCHAR(255) NOT NULL,
    upload_file_count INT          NOT NULL DEFAULT 0,             -- 업로드한 문서 갯수
    ask_count         INT          NOT NULL DEFAULT 0,             -- 챗봇 질문 수
    img_url           VARCHAR(512)          DEFAULT 'user_image.png',
    ip                VARCHAR(45),
    created_at        TIMESTAMPTZ           DEFAULT NOW(),
    updated_at        TIMESTAMPTZ           DEFAULT NOW(),

    CONSTRAINT pk_users          PRIMARY KEY (id),
    CONSTRAINT uq_users_email    UNIQUE (email),
    CONSTRAINT uq_users_nickname UNIQUE (nickname)
);

COMMENT ON COLUMN users.role              IS '회원 역할(권한 구분)';
COMMENT ON COLUMN users.upload_file_count IS '업로드한 문서 갯수';
COMMENT ON COLUMN users.ask_count         IS '챗봇 질문 수';

CREATE TABLE user_role_log (
    id                  BIGINT       GENERATED ALWAYS AS IDENTITY,
    target_user_id      VARCHAR(26),
    changed_by_user_id  VARCHAR(26)  NOT NULL,
    before_role         user_role    NOT NULL,
    after_role          user_role    NOT NULL,
    reason              TEXT,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),

    CONSTRAINT pk_user_role_log      PRIMARY KEY (id),
    CONSTRAINT fk_role_log_target    FOREIGN KEY (target_user_id)     REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_role_log_changer   FOREIGN KEY (changed_by_user_id) REFERENCES users (id)
);

CREATE TABLE documents (
    id              VARCHAR(26)      NOT NULL,   -- ULID, 백엔드 생성
    filename        VARCHAR(255),
    extension       VARCHAR(255),
    file_size       BIGINT,
    status          document_status  NOT NULL DEFAULT 'INITIAL',
    access_type     document_access  NOT NULL DEFAULT 'PRIVATE',
    uploaded_by_id  VARCHAR(26)      NOT NULL,
    approved_by_id  VARCHAR(26),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),       -- 업로드, 마지막으로 문서 수정한 시간

    CONSTRAINT pk_documents     PRIMARY KEY (id),
    CONSTRAINT fk_doc_uploader  FOREIGN KEY (uploaded_by_id) REFERENCES users (id),
    CONSTRAINT fk_doc_approver  FOREIGN KEY (approved_by_id) REFERENCES users (id) ON DELETE SET NULL
);

COMMENT ON COLUMN documents.updated_at IS '업로드, 마지막으로 문서 수정한 시간';

CREATE INDEX idx_documents_status     ON documents (status);
CREATE INDEX idx_document_uploaded_by ON documents (uploaded_by_id);

CREATE TABLE ocr_results (
    id               BIGINT      GENERATED ALWAYS AS IDENTITY,
    document_id      VARCHAR(26) NOT NULL,
    raw_text         TEXT,
    total_pages      INT,
    confidence_score FLOAT,                                        -- 0.0 ~ 1.0
    ocr_engine       ocr_engine  NOT NULL DEFAULT 'PADDLE',
    status           ocr_status  NOT NULL DEFAULT 'PENDING',
    error_message    TEXT,
    processed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ocr_results      PRIMARY KEY (id),
    CONSTRAINT uq_ocr_document     UNIQUE (document_id),
    CONSTRAINT fk_ocr_document     FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

COMMENT ON COLUMN ocr_results.confidence_score IS '0.0 ~ 1.0';

CREATE TABLE summary_llm_results (
    id             BIGINT        GENERATED ALWAYS AS IDENTITY,
    document_id    VARCHAR(26)   NOT NULL,                         -- ULID
    doc_main_type  doc_main_type,                                  -- 카테고리 1차분류
    doc_sub_type   doc_sub_type,                                   -- 카테고리 2차분류
    summary_ko     TEXT,
    model_name     VARCHAR(100),
    model_version  VARCHAR(50),
    processed_at   TIMESTAMPTZ,

    CONSTRAINT pk_summary_llm_results  PRIMARY KEY (id),
    CONSTRAINT uq_summary_document     UNIQUE (document_id),
    CONSTRAINT fk_summary_document     FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

COMMENT ON COLUMN summary_llm_results.doc_main_type IS '카테고리 1차분류';
COMMENT ON COLUMN summary_llm_results.doc_sub_type  IS '카테고리 2차분류';

CREATE INDEX idx_document_main_type ON summary_llm_results (doc_main_type);
CREATE INDEX idx_document_sub_type  ON summary_llm_results (doc_sub_type);

CREATE TABLE document_chunks (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY,
    document_id     VARCHAR(26) NOT NULL,
    chunk_index     INT         NOT NULL,
    chunk_text_en   TEXT        NOT NULL,                          -- 청크 원문(영어)
    token_count     INT,                                           -- 토큰 수 (임베딩 모델 기준)
    page_number     INT,                                           -- 출처 페이지 번호
    vector_point_id VARCHAR(36),
    is_indexed      BOOLEAN     NOT NULL DEFAULT FALSE,
    indexed_at      TIMESTAMPTZ,

    CONSTRAINT pk_document_chunks       PRIMARY KEY (id),
    CONSTRAINT uq_chunk_vector_point    UNIQUE (vector_point_id),
    CONSTRAINT fk_chunk_document        FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

COMMENT ON COLUMN document_chunks.chunk_text_en IS '청크 원문(영어)';
COMMENT ON COLUMN document_chunks.token_count   IS '토큰 수 (임베딩 모델 기준)';
COMMENT ON COLUMN document_chunks.page_number   IS '출처 페이지 번호';

CREATE INDEX idx_chunks_document_id ON document_chunks (document_id);
CREATE INDEX idx_chunks_not_indexed ON document_chunks (is_indexed) WHERE is_indexed = FALSE;

CREATE TABLE processing_jobs (
    id             BIGINT      GENERATED ALWAYS AS IDENTITY,
    document_id    VARCHAR(26) NOT NULL,
    job_type       job_type    NOT NULL,
    job_status     job_status  NOT NULL DEFAULT 'QUEUED',
    attempt_count  INT         NOT NULL DEFAULT 0,
    error_message  TEXT,                                           -- 마지막 실패 원인
    queued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at     TIMESTAMPTZ,
    finished_at    TIMESTAMPTZ,

    CONSTRAINT pk_processing_jobs  PRIMARY KEY (id),
    CONSTRAINT fk_job_document     FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

COMMENT ON COLUMN processing_jobs.error_message IS '마지막 실패 원인';

CREATE INDEX idx_jobs_document_id ON processing_jobs (document_id);
CREATE INDEX idx_jobs_type        ON processing_jobs (job_type);
CREATE INDEX idx_jobs_status      ON processing_jobs (job_status);

CREATE TABLE chat_sessions (
    id             VARCHAR(26)  NOT NULL,                          -- ULID
    user_id        VARCHAR(26)  NOT NULL,
    session_name   VARCHAR(200),
    last_active_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_chat_sessions   PRIMARY KEY (id),
    CONSTRAINT fk_session_user    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions (user_id);

CREATE TABLE chat_message (
    id                   VARCHAR(26)  NOT NULL,                    -- ULID
    session_id           VARCHAR(26)  NOT NULL,
    role                 chat_role    NOT NULL,
    content_ko           TEXT         NOT NULL,                    -- 한국어 (사용자 질문 or AI 답변)
    query_en             TEXT,                                     -- 검색에 사용된 영어 번역 쿼리
    retrieved_chunk_ids  JSONB,
    model_name           VARCHAR(100),
    latency_ms           INT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_chat_message     PRIMARY KEY (id),
    CONSTRAINT fk_message_session  FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
);

COMMENT ON COLUMN chat_message.content_ko          IS '한국어 (사용자 질문 or AI 답변)';
COMMENT ON COLUMN chat_message.query_en            IS '검색에 사용된 영어 번역 쿼리';

CREATE INDEX idx_messages_session ON chat_message (session_id);

CREATE TABLE approval_logs (
    id           BIGINT           GENERATED ALWAYS AS IDENTITY,
    document_id  VARCHAR(26),
    actor_id     VARCHAR(26),
    action       approval_action  NOT NULL,
    reason       TEXT,
    created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_approval_logs      PRIMARY KEY (id),
    CONSTRAINT fk_approval_document  FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL,
    CONSTRAINT fk_approval_actor     FOREIGN KEY (actor_id)     REFERENCES users (id)     ON DELETE SET NULL
);

CREATE INDEX idx_approval_document_id ON approval_logs (document_id);

CREATE TABLE pinned_documents (
    user_id      VARCHAR(26)  NOT NULL,
    document_id  VARCHAR(26)  NOT NULL,
    pin_order    INT          NOT NULL DEFAULT 0,                  -- 고정 순서 조정용
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_pinned_documents   PRIMARY KEY (user_id, document_id),
    CONSTRAINT fk_pin_user           FOREIGN KEY (user_id)     REFERENCES users      (id) ON DELETE CASCADE,
    CONSTRAINT fk_pin_document       FOREIGN KEY (document_id) REFERENCES documents  (id) ON DELETE CASCADE
);

COMMENT ON COLUMN pinned_documents.pin_order IS '고정 순서 조정용';

CREATE TABLE bookmarked_documents (
    user_id      VARCHAR(26)  NOT NULL,
    document_id  VARCHAR(26)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_bookmarked_documents  PRIMARY KEY (user_id, document_id),
    CONSTRAINT fk_bookmark_user         FOREIGN KEY (user_id)     REFERENCES users     (id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_document     FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

CREATE TYPE notification_type AS ENUM (
    'ROLE_PROMOTED',
    'ROLE_DEMOTED',
    'DOCUMENT_APPROVED',
    'DOCUMENT_REJECTED'
);
 
CREATE TABLE notifications (
    id           VARCHAR(26)       NOT NULL,               -- ULID, 백엔드 생성
    user_id      VARCHAR(26)       NOT NULL,               -- 알림 수신자
    type         notification_type NOT NULL,
    -- 역할 변경 시 → user_role_log.id, 문서 심사 시 → approval_logs.id
    ref_id       BIGINT            NOT NULL,               -- 연관 로그 PK
    message      TEXT              NOT NULL,               -- 프론트 노출 메시지 (백엔드에서 생성)
    is_read      BOOLEAN           NOT NULL DEFAULT FALSE,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
 
    CONSTRAINT pk_notifications  PRIMARY KEY (id),
    CONSTRAINT fk_notif_user     FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
 
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, created_at DESC)
    WHERE is_read = FALSE;