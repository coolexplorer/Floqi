# Development Setup

로컬 개발 환경 구성 가이드. Docker Compose를 사용하여 Supabase와 Upstash 없이 개발 가능합니다.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [VS Code](https://code.visualstudio.com/) + [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- Go 1.23+ (호스트에서 직접 실행 시)
- Node.js 20+ (호스트에서 직접 실행 시)

---

## Quick Start

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/floqi.git
cd floqi
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 API 키 등 필요한 값 입력
```

최소한 다음 값은 반드시 설정:
- `TOKEN_ENCRYPTION_KEY` — `openssl rand -hex 32`로 생성
- `ANTHROPIC_API_KEY` — Anthropic Console에서 발급

### 3. Docker 서비스 시작

```bash
docker-compose up -d
```

첫 실행 시 `supabase/migrations/` 폴더의 SQL 파일이 알파벳 순으로 자동 적용됩니다.

### 4. 서비스 상태 확인

```bash
docker-compose ps
# 모든 서비스가 healthy 상태인지 확인

docker-compose logs postgres  # PostgreSQL 로그
docker-compose logs redis     # Redis 로그
```

---

## 서비스 정보

| 서비스 | 로컬 주소 | 역할 |
|--------|-----------|------|
| PostgreSQL | `localhost:5432` | Supabase DB 대체 (로컬 개발용) |
| Redis | `localhost:6379` | Upstash 대체 (Asynq 작업 큐) |

### DB 접속 정보 (로컬)

```
host:     localhost
port:     5432
database: floqi
user:     postgres
password: postgres
```

psql 접속:
```bash
docker-compose exec postgres psql -U postgres -d floqi
```

---

## VS Code Devcontainer

Node.js + Go 통합 개발 환경을 한 번에 구성합니다.

1. VS Code에서 프로젝트 폴더 열기
2. `Ctrl+Shift+P` → **Dev Containers: Reopen in Container** 선택
3. 컨테이너 빌드 완료 후 자동으로 `npm install` 및 `go mod download` 실행

### 포워딩 포트

Devcontainer 안에서 개발 시 다음 포트가 호스트로 자동 포워딩됩니다:
- `3000` — Next.js Dev Server
- `5432` — PostgreSQL
- `6379` — Redis

---

## 호스트에서 직접 실행

Devcontainer 없이 호스트에서 직접 개발하는 방법입니다.

### Web (Next.js)

```bash
cd web
cp ../.env.example .env.local
# .env.local에서 Supabase 관련 키 대신 로컬 DB URL 사용
npm install
npm run dev
```

### Worker (Go)

```bash
cd worker
cp ../.env.example .env
# DATABASE_URL과 REDIS_ADDR이 로컬 Docker 서비스를 가리키는지 확인
go run ./cmd/worker
```

---

## 디버깅

VS Code의 `.vscode/launch.json` 설정이 포함되어 있습니다.

### Next.js 서버사이드 디버깅

1. VS Code Run & Debug 패널 열기 (`Ctrl+Shift+D`)
2. **Next.js: debug server-side** 선택 후 실행 (F5)

### Go Worker 디버깅

1. VS Code Run & Debug 패널 열기 (`Ctrl+Shift+D`)
2. **Go Worker** 선택 후 실행 (F5)
3. Delve 디버거가 자동으로 연결됨

---

## 마이그레이션 관리

### 마이그레이션 적용 확인

```bash
docker-compose exec postgres psql -U postgres -d floqi -c "\dt"
```

### 마이그레이션 재적용 (DB 초기화)

```bash
docker-compose down -v          # 볼륨 포함 삭제
docker-compose up -d            # 재시작 시 마이그레이션 자동 재적용
```

### 새 마이그레이션 파일 추가

`supabase/migrations/` 폴더에 `006_xxx.sql` 형식으로 추가하면 다음 DB 초기화 시 자동 적용됩니다.

> **주의**: `000_local_dev_init.sql`은 로컬 개발용 Supabase auth 스텁입니다. 프로덕션 Supabase에는 적용하지 마세요.

---

## Supabase vs 로컬 PostgreSQL 차이점

| 기능 | Supabase | 로컬 PostgreSQL |
|------|----------|----------------|
| Auth (JWT) | GoTrue 내장 | 미지원 (Worker 직접 연결) |
| `auth.uid()` | JWT에서 추출 | 세션 변수 또는 NULL 반환 |
| RLS | JWT 기반 | Worker는 postgres 유저로 우회 |
| Storage | S3 호환 | 미지원 (로컬 개발 불필요) |
| Realtime | WebSocket | 미지원 (로컬 개발 불필요) |

---

## 자주 발생하는 문제

### PostgreSQL 시작 실패

```bash
docker-compose logs postgres
# "FATAL: database 'floqi' does not exist" → 이미 생성된 볼륨 문제
docker-compose down -v && docker-compose up -d
```

### Redis 연결 실패

```bash
docker-compose exec redis redis-cli ping
# PONG 응답이 오면 정상
```

### 마이그레이션 오류

마이그레이션 파일 순서 확인: `000_` → `001_` → ... 순으로 실행됩니다.
```bash
ls supabase/migrations/
```
