# Floqi 배포 가이드

## 개요

Floqi는 다음 플랫폼에서 호스팅됩니다:

- **Web (Next.js)**: Vercel
- **Worker (Go)**: Fly.io
- **데이터베이스**: Supabase (PostgreSQL)
- **메시지 큐**: Upstash (Redis)

이 가이드는 Floqi를 프로덕션 환경에 배포하는 절차를 설명합니다.

---

## 1. Vercel 배포 (Next.js Web)

### 1.1 사전 준비

1. **Vercel 계정 생성** (https://vercel.com)
2. **GitHub 계정 연결**
3. **프로젝트 Fork/Push**: GitHub에 코드 푸시
4. **Supabase 프로젝트 생성**

### 1.2 배포 단계

#### Step 1: Vercel 프로젝트 생성

```bash
# Vercel CLI 설치
npm i -g vercel

# Vercel 로그인
vercel login

# 프로젝트 루트에서 배포
cd web
vercel
```

또는 Vercel 웹 UI에서:
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. "Add New" → "Project"
3. GitHub 저장소에서 `Floqi` 선택
4. 기본 설정 확인 후 "Deploy"

#### Step 2: 환경 변수 설정

Vercel Dashboard → Project Settings → Environment Variables에서 다음을 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_BASE_URL=https://floqi-worker.fly.dev
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

**주의**: `NEXT_PUBLIC_` 접두사는 클라이언트에 노출될 변수입니다. 시크릿은 절대 노출하지 마세요.

#### Step 3: 도메인 설정 (선택사항)

1. Vercel → Project Settings → Domains
2. 커스텀 도메인 추가 (예: floqi.example.com)
3. DNS 레코드 설정 (Vercel가 자동 가이드함)

### 1.3 배포 후 확인

```bash
# Vercel 배포된 URL에서 테스트
https://floqi.vercel.app

# 로그 확인
vercel logs web --limit 50
```

### 1.4 자동 배포 설정

GitHub에 푸시하면 자동으로 Vercel에서 배포됩니다:
- `main` 브랜치 → 프로덕션 배포
- PR → 프리뷰 배포 (자동 생성)

---

## 2. Fly.io 배포 (Go Worker)

### 2.1 사전 준비

1. **Fly.io 계정 생성** (https://fly.io)
2. **Fly CLI 설치**:
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh
   ```
3. **Fly 로그인**:
   ```bash
   flyctl auth login
   ```

### 2.2 배포 단계

#### Step 1: Fly 앱 생성

```bash
cd worker

# Fly 앱 초기화 (fly.toml이 없으면)
flyctl launch --name floqi-worker --region nrt --no-deploy

# 또는 기존 fly.toml이 있으면:
flyctl deploy
```

#### Step 2: 환경 변수 설정

**방법 1: 웹 UI에서**
1. [Fly Dashboard](https://fly.io/dashboard) → floqi-worker
2. "Variables" → "Set Variable"
3. 모든 필수 환경 변수 추가 (`docs/deployment/env-template.md` 참조)

**방법 2: CLI에서**
```bash
# 개별 변수 설정
flyctl secrets set DATABASE_URL="postgresql://..." REDIS_PASSWORD="..." -a floqi-worker

# 여러 변수 한번에 (--stdin 사용)
cat > secrets.env << EOF
DATABASE_URL=postgresql://...
REDIS_PASSWORD=...
TOKEN_ENCRYPTION_KEY=...
EOF

cat secrets.env | flyctl secrets import -a floqi-worker
```

**주의**: `flyctl secrets set`은 값을 암호화하여 저장합니다. 절대 로그에 노출되지 않습니다.

#### Step 3: 배포

```bash
# 배포
flyctl deploy -a floqi-worker

# 배포 상태 확인
flyctl status -a floqi-worker

# 로그 확인
flyctl logs -a floqi-worker
```

### 2.3 Health Check 설정

`fly.toml`에 이미 설정되어 있습니다:
- 경로: `/health`
- 간격: 10초
- 타임아웃: 5초

Worker는 `/health` 엔드포인트를 제공해야 합니다:
```go
router.GET("/health", func(c *gin.Context) {
    c.JSON(200, gin.H{"status": "ok"})
})
```

### 2.4 스케일링 (프로덕션)

```bash
# 인스턴스 수 증가
flyctl scale count 2 -a floqi-worker

# VM 리소스 증가
flyctl scale vm shared-cpu-2x -a floqi-worker

# 설정 확인
flyctl status -a floqi-worker
```

---

## 3. Supabase 프로덕션 설정

### 3.1 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. "New Project" 클릭
3. Organization, Project Name, Password, Region 설정
4. 프로젝트 생성 완료

### 3.2 마이그레이션 실행

```bash
cd supabase

# 마이그레이션 파일 확인
ls migrations/

# Supabase CLI로 마이그레이션 실행
supabase db push

# 또는 SQL Editor에서 직접 실행
# Supabase Dashboard → SQL Editor → 각 마이그레이션 파일 실행
```

**마이그레이션 순서**:
1. `001_create_profiles.sql` — 사용자 프로필 + RLS
2. `002_create_connections.sql` — OAuth 토큰 저장
3. `003_create_automations.sql` — 자동화 정의
4. `004_create_execution_logs.sql` — 실행 로그

### 3.3 RLS 정책 확인

Supabase Dashboard → Authentication → Policies:
- 모든 테이블에 `auth.uid() = user_id` 정책 적용 확인
- Worker는 service_role 키로 RLS 바이패스

### 3.4 API 키 얻기

Supabase Dashboard → Project Settings → API:
- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`에 사용
- **Anon Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 사용
- **Service Role Key**: Worker에서 `DATABASE_URL` 연결 문자열에 사용

---

## 4. Upstash Redis 설정

### 4.1 Redis 클러스터 생성

1. [Upstash Console](https://console.upstash.com)에 로그인
2. "Create Database" 클릭
3. 이름, 지역, 용량 설정:
   - **Region**: ap-northeast-1 (Tokyo) 추천
   - **Database Type**: Redis
   - **Eviction Policy**: `allkeys-lru` (메모리 부족 시 오래된 키 삭제)

### 4.2 연결 설정

Upstash Console → Database Details:
- **Endpoint**: `REDIS_ADDR`에 사용 (HOST:PORT 형식)
- **Password**: `REDIS_PASSWORD`에 사용

**연결 문자열 포맷**:
```
redis://default:PASSWORD@HOST:PORT
```

### 4.3 연결 테스트

```bash
# Worker에서 (Go)
redis-cli -h HOST -p PORT -a PASSWORD PING
# 응답: PONG

# 또는 Node.js에서
npm install redis
node -e "
const redis = require('redis');
const client = redis.createClient({ url: 'redis://HOST:PORT', password: 'PASSWORD' });
client.on('connect', () => console.log('Connected'));
client.connect();
"
```

---

## 5. 환경 변수 체크리스트

모든 배포 플랫폼에서 다음 변수를 설정했는지 확인:

### Vercel (Next.js)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_API_BASE_URL`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`

### Fly.io (Worker)
- [ ] `DATABASE_URL`
- [ ] `REDIS_ADDR`
- [ ] `REDIS_PASSWORD`
- [ ] `TOKEN_ENCRYPTION_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `NEWS_API_KEY`
- [ ] `OPENWEATHERMAP_API_KEY`

---

## 6. 모니터링 및 로깅

### Vercel 로깅

```bash
# 실시간 로그 확인
vercel logs web --tail

# 배포 로그 확인
vercel logs web --since 2024-01-01
```

### Fly.io 로깅

```bash
# 실시간 로그 확인
flyctl logs -a floqi-worker --follow

# 특정 VM 로그만 확인
flyctl logs -a floqi-worker --instance INSTANCE_ID
```

### Supabase 모니터링

Supabase Dashboard → Database → Monitoring:
- CPU 사용률
- 메모리 사용률
- 연결 수
- 느린 쿼리

---

## 7. 트러블슈팅

### Vercel 배포 실패

```bash
# 빌드 로그 확인
vercel logs web --limit 100

# 환경 변수 확인
vercel env ls

# 수동으로 빌드 테스트
npm run build
```

**흔한 문제**:
- 환경 변수 누락: Vercel Dashboard에서 모든 변수 확인
- 포트 충돌: Vercel는 자동으로 포트 할당
- Node.js 버전: 프로젝트가 최소 18.17 요구

### Fly.io 배포 실패

```bash
# 배포 상태 확인
flyctl status -a floqi-worker

# 배포 재시도
flyctl deploy -a floqi-worker --force-machines

# 머신 상태 확인
flyctl machines list -a floqi-worker

# 로그에서 에러 메시지 확인
flyctl logs -a floqi-worker --follow
```

**흔한 문제**:
- 환경 변수 누락: `flyctl secrets list -a floqi-worker`로 확인
- Dockerfile 오류: `flyctl deploy -a floqi-worker --build-only`로 이미지 빌드만
- 헬스체크 실패: Worker가 `/health` 엔드포인트 구현 확인

### Supabase 연결 실패

```bash
# 연결 문자열 확인
echo $DATABASE_URL

# PostgreSQL 직접 연결 테스트
psql postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres -c "SELECT 1"

# 방화벽 확인 (IP 화이트리스트 설정 필요할 수 있음)
```

### Upstash Redis 연결 실패

```bash
# Redis CLI 테스트 (설치: brew install redis)
redis-cli -h HOST -p PORT -a PASSWORD PING

# 또는 온라인 도구 사용: https://www.hiredis.io/
```

---

## 8. 배포 후 확인 체크리스트

### 웹 배포 확인

- [ ] Vercel URL 접속 가능
- [ ] 로그인 페이지 로드
- [ ] Google OAuth 버튼 표시
- [ ] 회원가입 → 메일 인증 플로우
- [ ] 로그인 후 대시보드 접근 가능
- [ ] 자동화 생성 가능
- [ ] 자동화 실행 로그 표시

### Worker 배포 확인

```bash
# Fly.io에서 실행 중인지 확인
flyctl status -a floqi-worker

# 헬스체크 성공 여부
curl https://floqi-worker.fly.dev/health

# 자동화 실행 로그 (Supabase 확인)
SELECT * FROM automation_execution_logs ORDER BY created_at DESC LIMIT 10;
```

### 데이터베이스 확인

```bash
# Supabase SQL Editor에서:
SELECT COUNT(*) FROM profiles;  -- 회원 수
SELECT COUNT(*) FROM oauth_tokens;  -- 연결된 계정 수
SELECT COUNT(*) FROM automations;  -- 생성된 자동화 수
```

---

## 9. 프로덕션 보안 체크리스트

- [ ] HTTPS 활성화 (Vercel/Fly.io 자동)
- [ ] CORS 설정 (프론트엔드 도메인만 허용)
- [ ] Rate limiting 설정 (선택사항)
- [ ] RLS 정책 모든 테이블에 적용
- [ ] 시크릿 키 절대 커밋하지 않기
- [ ] .env 파일 .gitignore에 포함
- [ ] HTTPS 리다이렉트 활성화
- [ ] 헬스체크 엔드포인트 인증 필요 없음 (모니터링용)

---

## 10. 롤백 절차

### Vercel 롤백

```bash
# 이전 배포 목록 보기
vercel deployments

# 특정 배포로 프로모션
vercel promote [DEPLOYMENT_URL]
```

### Fly.io 롤백

```bash
# 배포 히스토리 보기
flyctl releases -a floqi-worker

# 이전 버전으로 롤백
flyctl releases rollback -a floqi-worker
```

---

## 11. 추가 리소스

- **Vercel 문서**: https://vercel.com/docs
- **Fly.io 문서**: https://fly.io/docs/
- **Supabase 문서**: https://supabase.com/docs
- **Upstash 문서**: https://upstash.com/docs
- **Next.js 배포**: https://nextjs.org/docs/app/building-your-application/deploying
- **Go 배포**: https://golang.org/doc/effective_go

---

**마지막 업데이트**: 2024-03-06
**작성자**: Floqi Development Team
