# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive

# 공통 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg supervisor bash \
    && rm -rf /var/lib/apt/lists/*

# PostgreSQL 17 (PGDG) 저장소 등록
# /etc/os-release 에서 실제 Debian 코드명을 읽어 맞는 PGDG 저장소를 사용
RUN install -dm 755 /etc/apt/keyrings \
    && curl -fsSL --retry 5 --retry-delay 3 \
       https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg \
    && . /etc/os-release \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/postgresql.gpg] \
       https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list

# PostgreSQL 17 + Redis 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-17 redis-server redis-tools \
    && rm -rf /var/lib/apt/lists/*

# MinIO 바이너리 (latest)
RUN curl -fsSL https://dl.min.io/server/minio/release/linux-amd64/minio \
      -o /usr/local/bin/minio && chmod +x /usr/local/bin/minio

# Qdrant 바이너리 v1.17.1
RUN curl -fsSL https://github.com/qdrant/qdrant/releases/download/v1.17.1/qdrant-x86_64-unknown-linux-gnu.tar.gz \
      | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/qdrant

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/app ./app
COPY backend/main.py ./

# ---- supervisord 설정 (인라인 생성) ----
COPY <<'EOF' /etc/supervisor/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/dev/null
logfile_maxbytes=0

[program:postgres]
command=/usr/lib/postgresql/17/bin/postgres -D /data/postgres
user=postgres
priority=10
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:redis]
command=redis-server --notify-keyspace-events Ex --dir /data
priority=10
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:minio]
command=minio server /data/minio --console-address ":9001"
environment=MINIO_ROOT_USER="admin",MINIO_ROOT_PASSWORD="qwer1234"
priority=10
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:qdrant]
command=qdrant
environment=QDRANT__STORAGE__STORAGE_PATH="/data/qdrant"
priority=10
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:api]
command=/bin/bash -c "until pg_isready -h 127.0.0.1 -U test -q; do sleep 1; done; until redis-cli -h 127.0.0.1 ping; do sleep 1; done; exec uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
directory=/backend
environment=DATABASE_URL="postgresql+asyncpg://test:qwer1234@127.0.0.1:5432/save_point",REDIS_URL="redis://127.0.0.1:6379/0"
priority=100
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:expiry-worker]
command=/bin/bash -c "until redis-cli -h 127.0.0.1 ping; do sleep 1; done; exec uv run python -m app.presence.expiry_worker"
directory=/backend
environment=DATABASE_URL="postgresql+asyncpg://test:qwer1234@127.0.0.1:5432/save_point",REDIS_URL="redis://127.0.0.1:6379/0"
priority=100
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

# ---- entrypoint (인라인 생성, 실행권한 부여) ----
COPY --chmod=755 <<'EOF' /entrypoint.sh
#!/usr/bin/env bash
set -e

PGDATA=/data/postgres
PGBIN=/usr/lib/postgresql/17/bin

mkdir -p /data/minio /data/qdrant "$PGDATA"
chown -R postgres:postgres "$PGDATA"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[init] PostgreSQL 초기화..."
  su postgres -c "$PGBIN/initdb -D $PGDATA --encoding=UTF8"
  echo "listen_addresses = '*'"               >> "$PGDATA/postgresql.conf"
  echo "host all all 0.0.0.0/0 scram-sha-256" >> "$PGDATA/pg_hba.conf"
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -w start"
  su postgres -c "psql -v ON_ERROR_STOP=1 --command \"CREATE USER test WITH SUPERUSER PASSWORD 'qwer1234';\""
  su postgres -c "$PGBIN/createdb -O test save_point"
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -w stop"
fi

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
EOF

RUN sed -i 's/\r$//' /entrypoint.sh

EXPOSE 8000 5432 6379 9000 9001 6333 6334
ENTRYPOINT ["/entrypoint.sh"]