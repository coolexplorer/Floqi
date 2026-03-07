# Floqi 환경 변수 템플릿

이 문서는 Floqi 배포에 필요한 모든 환경 변수를 정리합니다.

## 개요

| 플랫폼 | 역할 | 필수 변수 |
|--------|------|---------|
| **Vercel (Web)** | Next.js 프론트엔드 | 5개 |
| **Fly.io (Worker)** | Go 백엔드 워커 | 9개 |
| **개발 환경** | 로컬 테스트 | 모두 |

---

## 1. Vercel (Web) 환경 변수

### 설정 방법

**Vercel Dashboard → Project Settings → Environment Variables**

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_BASE_URL=https://floqi-worker.fly.dev
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...
```

### 상세 설명

#### 1.1 `NEXT_PUBLIC_SUPABASE_URL` ⭐ 공개

- **값**: Supabase Project URL
- **예시**: `https://abcdefgh.supabase.co`
- **출처**: Supabase Dashboard → Settings → API
- **용도**: 클라이언트에서 Supabase 접근
- **범위**: 프로덕션, 프리뷰, 개발
- **노출**: 공개 (브라우저 JavaScript에 포함)

#### 1.2 `NEXT_PUBLIC_SUPABASE_ANON_KEY` ⭐ 공개

- **값**: Supabase Anon Key
- **예시**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **출처**: Supabase Dashboard → Settings → API → Anon Key
- **용도**: 클라이언트 인증 (JWT)
- **범위**: 프로덕션, 프리뷰, 개발
- **노출**: 공개 (브라우저 JavaScript에 포함)
- **보안**: RLS 정책으로 테이블 접근 제어

#### 1.3 `NEXT_PUBLIC_API_BASE_URL` ⭐ 공개

- **값**: Worker API 베이스 URL
- **예시**:
  - 프로덕션: `https://floqi-worker.fly.dev`
  - 개발: `http://localhost:8080`
- **용도**: 프론트엔드에서 Worker API 호출
- **범위**: 프로덕션, 프리뷰, 개발
- **노출**: 공개

#### 1.4 `GOOGLE_CLIENT_ID` 🔒 시크릿

- **값**: Google OAuth Client ID
- **예시**: `123456789-abc1234567890abcdefghij1234567890.apps.googleusercontent.com`
- **출처**: [Google Cloud Console](https://console.cloud.google.com)
  - 프로젝트 선택 → API & Services → Credentials
  - "OAuth 2.0 Client ID" → "Web application" 찾기
- **용도**: Google OAuth 초기화
- **범위**: 프로덕션, 프리뷰, 개발
- **노출**: 공개 (하지만 Secret은 아님)
- **설정 단계**:
  1. [Google Cloud Console](https://console.cloud.google.com) 접속
  2. 프로젝트 생성 또는 기존 프로젝트 선택
  3. APIs & Services → OAuth consent screen
     - User type: External 선택
     - App name, Support email, 개발자 연락처 입력
   4. Credentials → Create Credentials → OAuth 2.0 Client ID
     - Application type: Web application
     - Authorized redirect URIs 추가:
       - `https://YOUR_VERCEL_URL/api/auth/callback/google`
       - `https://floqi-worker.fly.dev/auth/callback`
       - 개발: `http://localhost:3000/api/auth/callback/google`

#### 1.5 `GOOGLE_CLIENT_SECRET` 🔒 시크릿

- **값**: Google OAuth Client Secret
- **예시**: `GOCSPX-abc1234567890abcdefghij123456`
- **출처**: [Google Cloud Console](https://console.cloud.google.com) → Credentials
- **용도**: OAuth 콜백 검증
- **범위**: 프로덕션, 프리뷰, 개발
- **노출**: ❌ 절대 공개하지 마세요! (Vercel 환경 변수에만 저장)
- **보안**:
  - GitHub/코드에 절대 커밋 금지
  - .gitignore에 `.env.local` 포함 확인
  - Vercel에서만 암호화하여 저장

---

## 2. Fly.io (Worker) 환경 변수

### 설정 방법

**Fly.io CLI를 통한 설정**:

```bash
# 개별 환경 변수 설정
flyctl secrets set DATABASE_URL="..." REDIS_PASSWORD="..." -a floqi-worker

# 또는 파일 import
cat secrets.env | flyctl secrets import -a floqi-worker
```

또는 **Fly.io Dashboard**:
- Dashboard → floqi-worker → Variables → Set Variable

```
DATABASE_URL=postgresql://postgres:PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
REDIS_ADDR=YOUR_HOST.upstash.io:6379
REDIS_PASSWORD=YOUR_PASSWORD
TOKEN_ENCRYPTION_KEY=0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a
ANTHROPIC_API_KEY=sk-ant-v0-abc1234567890abcdefghij1234567890abcdefghij1234567890abcdefghij
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...
NEWS_API_KEY=abc1234567890abcdefghij1234567890ab
OPENWEATHERMAP_API_KEY=abc1234567890abcdefghij1234567890ab
```

### 상세 설명

#### 2.1 `DATABASE_URL` 🔒 시크릿

- **값**: PostgreSQL 연결 문자열
- **포맷**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- **예시**: `postgresql://postgres:my_secure_password@db.abcdefgh.supabase.co:5432/postgres`
- **출처**: Supabase Dashboard → Settings → Database
- **용도**: Worker에서 데이터베이스 접근
- **범위**: 프로덕션만 (Worker는 production-only)
- **노출**: ❌ 절대 공개하지 마세요!
- **보안**:
  - 암호화되어 Fly.io에 저장됨
  - service_role 키 기반 (RLS 바이패스)
  - 로그에 노출되지 않음
- **확인 방법**:
  ```bash
  # Fly.io 환경 변수 확인 (비밀값은 마스킹됨)
  flyctl secrets list -a floqi-worker
  ```

#### 2.2 `REDIS_ADDR` 🔒 시크릿

- **값**: Redis 호스트:포트
- **포맷**: `HOST:PORT` (또는 `HOST.upstash.io:PORT`)
- **예시**: `abc1234567890abcdefghij1234567890.upstash.io:6379`
- **출처**: Upstash Console → Database Details → Endpoint
- **용도**: 메시지 큐 (Asynq) 연결
- **범위**: 프로덕션, 개발
- **노출**: ❌ 절대 공개하지 마세요!

#### 2.3 `REDIS_PASSWORD` 🔒 시크릿

- **값**: Redis 인증 비밀번호
- **예시**: `AYXabc1234567890abcdefghij1234567890abcdefghij==`
- **출처**: Upstash Console → Database Details → Password
- **용도**: Redis 인증
- **범위**: 프로덕션, 개발
- **노출**: ❌ 절대 공개하지 마세요!

#### 2.4 `TOKEN_ENCRYPTION_KEY` 🔒 시크릿

- **값**: AES-256 암호화 키 (64 자리 HEX)
- **길이**: 32 바이트 = 64 HEX 글자
- **예시**: `0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a`
- **생성**:
  ```bash
  # 개발 환경
  openssl rand -hex 32

  # 또는 Go에서
  import "crypto/rand"
  import "encoding/hex"
  b := make([]byte, 32)
  rand.Read(b)
  hex.EncodeToString(b)
  ```
- **용도**: OAuth 토큰 AES-256-GCM 암호화
- **범위**: 프로덕션, 개발
- **노출**: ❌ 절대 공개하지 마세요!
- **중요**:
  - 키를 잃으면 이전 토큰 복호화 불가
  - 프로덕션 배포 전에 안전한 곳에 백업

#### 2.5 `ANTHROPIC_API_KEY` 🔒 시크릿

- **값**: Anthropic Claude API 키
- **포맷**: `sk-ant-v0-...`
- **예시**: `sk-ant-v0-abc1234567890abcdefghij1234567890abcdefghij1234567890abcdefghij`
- **출처**: [Anthropic Console](https://console.anthropic.com) → API Keys
- **용도**: Claude API 호출 (AI Agent)
- **범위**: 프로덕션만
- **노출**: ❌ 절대 공개하지 마세요!
- **설정**:
  1. https://console.anthropic.com에 로그인
  2. "API Keys" → "Create Key"
  3. 이름 입력 (예: "floqi-worker-prod")
  4. 키 복사하여 Fly.io에 저장

#### 2.6 `GOOGLE_CLIENT_ID` 🔒 시크릿

- **값**: Google OAuth Client ID (Web App)
- **용도**: Worker에서 Google 토큰 검증
- **범위**: 프로덕션, 개발
- **노출**: 공개 가능 (Secret과 다름)

#### 2.7 `GOOGLE_CLIENT_SECRET` 🔒 시크릿

- **값**: Google OAuth Client Secret
- **용도**: Worker에서 OAuth 콜백 검증
- **범위**: 프로덕션, 개발
- **노출**: ❌ 절대 공개하지 마세요!

#### 2.8 `NEWS_API_KEY` 🔒 시크릿 (선택사항)

- **값**: News API 키
- **출처**: [News API](https://newsapi.org) → API Keys
- **용도**: Reading Digest 템플릿에서 뉴스 조회
- **범위**: 프로덕션, 개발
- **노출**: ❌ 절대 공개하지 마세요!
- **필수 여부**: MVP에서는 선택사항 (나중에 추가 가능)

#### 2.9 `OPENWEATHERMAP_API_KEY` 🔒 시크릿 (선택사항)

- **값**: OpenWeatherMap API 키
- **출처**: [OpenWeatherMap](https://openweathermap.org) → API Keys
- **용도**: Morning Briefing에서 날씨 조회
- **범위**: 프로덕션, 개발
- **노출**: ❌ 절대 공개하지 마세요!
- **필수 여부**: MVP에서는 선택사항 (나중에 추가 가능)

---

## 3. 개발 환경 설정 (.env.local)

### 웹 개발 환경

**파일**: `web/.env.local`

```bash
# Supabase (로컬 Supabase Docker 또는 클라우드)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Worker API (로컬)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Google OAuth (same as production)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

### Worker 개발 환경

**파일**: `worker/.env.local`

```bash
# 로컬 개발용
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

TOKEN_ENCRYPTION_KEY=0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a

ANTHROPIC_API_KEY=sk-ant-v0-...
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# 선택사항
NEWS_API_KEY=
OPENWEATHERMAP_API_KEY=
```

### Supabase 로컬 개발

```bash
# Supabase CLI 설치
brew install supabase/tap/supabase

# 로컬 Supabase 시작
supabase start

# 마이그레이션 적용
supabase db push

# 로컬 Supabase 중지
supabase stop
```

---

## 4. 환경별 설정 체크리스트

### 개발 환경 ✅

- [ ] `web/.env.local` 생성
- [ ] `worker/.env.local` 생성
- [ ] Supabase 로컬 실행 또는 클라우드 사용
- [ ] Redis 로컬 또는 개발 클라우드 사용
- [ ] `npm run dev` 실행 가능
- [ ] `go run ./cmd/worker` 실행 가능

### Vercel 프로덕션 ✅

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- [ ] `NEXT_PUBLIC_API_BASE_URL` 설정
- [ ] `GOOGLE_CLIENT_ID` 설정
- [ ] `GOOGLE_CLIENT_SECRET` 설정
- [ ] 배포 후 로그인 테스트

### Fly.io 프로덕션 ✅

- [ ] `DATABASE_URL` 설정
- [ ] `REDIS_ADDR` 설정
- [ ] `REDIS_PASSWORD` 설정
- [ ] `TOKEN_ENCRYPTION_KEY` 설정
- [ ] `ANTHROPIC_API_KEY` 설정
- [ ] `GOOGLE_CLIENT_ID` 설정
- [ ] `GOOGLE_CLIENT_SECRET` 설정
- [ ] 헬스체크 정상 작동
- [ ] 로그 확인

---

## 5. 보안 가이드

### ✅ 해야 할 일

1. **로컬 .env 파일 .gitignore에 추가**
   ```
   .env.local
   .env.*.local
   secrets.env
   ```

2. **프로덕션 시크릿 안전 관리**
   - Vercel, Fly.io, Upstash 내장 시크릿 관리자 사용
   - 절대 GitHub에 커밋하지 않기
   - 정기적으로 키 로테이션

3. **키 생성 및 저장**
   - 강력한 난수로 생성
   - 비밀번호 관리자(1Password, Bitwarden 등)에 백업
   - 팀원들과 안전하게 공유

### ❌ 하지 말아야 할 일

1. **절대 공개하지 마세요**
   - GitHub 퍼블릭 저장소
   - Slack, Discord 등 채팅
   - 이메일
   - 로그 파일

2. **하드코딩 금지**
   ```go
   // ❌ 나쁜 예
   const apiKey = "sk-ant-v0-..."

   // ✅ 좋은 예
   apiKey := os.Getenv("ANTHROPIC_API_KEY")
   ```

3. **Git 히스토리에 남기지 않기**
   ```bash
   # ❌ 절대 하지 말 것
   git add .env.local

   # ✅ 올바른 방법
   echo ".env.local" >> .gitignore
   ```

---

## 6. 트러블슈팅

### 환경 변수가 적용되지 않을 때

**Vercel**:
```bash
# 환경 변수 확인
vercel env ls

# 재배포 (캐시 무효화)
vercel --prod --force
```

**Fly.io**:
```bash
# 시크릿 확인
flyctl secrets list -a floqi-worker

# 배포 후 적용 여부 확인
flyctl logs -a floqi-worker --follow
```

### 로컬 개발에서 환경 변수 로드 안 될 때

```bash
# 1. 파일 존재 확인
ls -la worker/.env.local

# 2. Go에서 로드 확인
go run ./cmd/worker  # 환경 변수 로그 출력하는지 확인

# 3. 직접 로드하기
export $(cat worker/.env.local | xargs)
go run ./cmd/worker
```

---

## 7. 환경 변수 로테이션

### Anthropic API 키 로테이션

1. [Anthropic Console](https://console.anthropic.com) → API Keys
2. 새 키 생성
3. Vercel, Fly.io에 새 키 설정
4. 배포 확인 후 이전 키 삭제

### Google OAuth 클라이언트 로테이션

1. [Google Cloud Console](https://console.cloud.google.com) → Credentials
2. 새 OAuth 2.0 Client ID 생성
3. Vercel, Fly.io에 새 ID/Secret 설정
4. 배포 후 이전 클라이언트 삭제

### Redis 비밀번호 로테이션

1. Upstash Console → Database Settings → Rotate Password
2. Fly.io `REDIS_PASSWORD` 업데이트
3. 배포
4. 이전 비밀번호 삭제

---

**마지막 업데이트**: 2024-03-06
**문서 버전**: 1.0
