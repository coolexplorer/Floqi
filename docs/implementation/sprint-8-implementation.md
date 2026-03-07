# Sprint 8 구현 문서 (Post-MVP P1: Notion OAuth + Rate Limiting + Token Refresh 알림)

> **기간**: Post-MVP P1
> **목표**: Notion OAuth 연결, Rate Limiting 미들웨어, 토큰 갱신 실패 알림 UI
> **완료일**: 2026-03-07

---

## 1. 개요

### 1.1 스프린트 목표
- PM-02: Notion OAuth 연결 — Google과 동일한 패턴으로 Notion 서비스 연결 구현
- PM-14: Rate Limiting 미들웨어 — API 엔드포인트 전체에 Upstash Redis 기반 속도 제한 추가
- PM-03: 토큰 갱신 실패 → 재연결 알림 UI — OAuth 만료 시 자동 감지 및 사용자 안내

### 1.2 완료된 User Stories
- US-202: Notion OAuth 서비스 연결 ✅
- US-1005: Rate Limiting 미들웨어 ✅
- US-205: OAuth 토큰 자동 갱신 실패 → 재연결 안내 ✅

### 1.3 Story Points
- PM-02: 5 SP ✅
- PM-14: 3 SP ✅
- PM-03: 3 SP ✅
- **합계: 11 SP**

---

## 2. 컴포넌트별 구현 사항

### 2.1 Web (Next.js)

#### 2.1.1 PM-02: Notion OAuth Connect Route

**파일**: `web/src/app/api/auth/connect/notion/route.ts`

**목적**: 사용자가 "Notion 연결" 버튼 클릭 시 Notion OAuth Consent 화면으로 리다이렉트

**구현 로직**:
```
1. CSRF 방지용 랜덤 state 생성 (crypto.randomBytes 32바이트 → hex)
2. Notion OAuth Authorization URL 생성:
   - https://api.notion.com/v1/oauth/authorize
   - params: client_id, redirect_uri, response_type=code, owner=user, state
3. oauth_state 쿠키 설정 (HttpOnly, SameSite=Lax, Max-Age=600)
4. 307 리다이렉트
```

**Notion OAuth 특성 (Google과 다른 점)**:
- `owner=user` 파라미터 필수 (Notion OAuth 요구사항)
- access_token이 만료되지 않음 → refresh_token 불필요
- 환경변수: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`

---

#### 2.1.2 PM-02: Notion OAuth Callback Route

**파일**: `web/src/app/api/auth/connect/notion/callback/route.ts`

**목적**: Notion에서 code를 받아 access_token으로 교환 후 암호화 저장

**구현 로직**:
```
1. code, state 파라미터 검증 (없으면 400)
2. CSRF 검증: oauth_state 쿠키 vs URL state 비교 (불일치 시 400)
3. Supabase auth.getUser()로 사용자 인증 확인 (미인증 시 401)
4. Notion Token Exchange (Google과 다른 방식):
   - POST https://api.notion.com/v1/oauth/token
   - Authorization: Basic base64(client_id:client_secret)  ← Google은 client_secret을 body에 포함
   - Body: { grant_type: "authorization_code", code, redirect_uri }
5. access_token을 AES-256-GCM으로 암호화 (lib/crypto.ts encrypt())
6. connected_services upsert:
   - service_name: "notion"
   - encrypted_access_token: 암호화된 토큰
   - connected_at: 현재 시각
7. oauth_state 쿠키 삭제 후 /connections 리다이렉트
```

**보안 고려사항**:
- HTTP Basic Auth 사용 (Notion API 요구사항) — client_secret이 Authorization 헤더에 포함
- Notion token은 만료되지 않으므로 expires_at, encrypted_refresh_token 저장 불필요

---

#### 2.1.3 PM-14: Rate Limiting 라이브러리

**파일**: `web/src/lib/ratelimit.ts`

**목적**: Upstash Redis 기반 Sliding Window Rate Limiter

**구현 로직**:
```
Redis INCR + EXPIRE 패턴으로 구현:
1. key = "ratelimit:{type}:{ip}" (type: "api" | "webhook")
2. Redis INCR key → 현재 카운트 반환
3. 카운트 == 1이면 EXPIRE key 60 (첫 요청 시 윈도우 시작)
4. limit 초과 시: success=false, retryAfter=60s
5. 정상 시: success=true, remaining=limit-count

반환 타입:
interface RateLimitResult {
  success: boolean
  limit: number        // 10 (webhook) | 60 (api)
  remaining: number    // limit - count
  retryAfter?: number  // 초과 시 재시도 대기 시간(초)
}
```

**한계**: 정확한 sliding window가 아닌 fixed window (1분 단위 리셋).
MVP 용도로 충분하며, 정밀한 sliding window가 필요하면 `@upstash/ratelimit` 패키지 도입 고려.

---

#### 2.1.4 PM-14: Rate Limiting 미들웨어

**파일**: `web/src/middleware.ts`

**목적**: 모든 API 라우트에 대한 속도 제한 적용

**구현 로직**:
```
라우트별 정책:
- /api/auth/* → rate limiting 제외 (OAuth flow 방해 없도록)
- /api/webhooks/* → 10 req/min per IP (엄격한 제한)
- /api/* → 60 req/min per IP (일반 제한)

IP 추출:
- X-Forwarded-For 헤더 첫 번째 IP (Vercel 프록시 환경)
- 없으면 127.0.0.1 폴백

응답 헤더 (정상 요청):
- X-RateLimit-Limit: 60 (또는 10)
- X-RateLimit-Remaining: 남은 요청 수

초과 시 (429):
- Retry-After: 60
- X-RateLimit-Limit, X-RateLimit-Remaining 헤더 포함
```

---

#### 2.1.5 PM-03: 재연결 배너 UI

**파일**: `web/src/app/(dashboard)/connections/page.tsx`

**목적**: 토큰 갱신 실패로 `is_active=false`가 된 서비스에 재연결 배너 표시

**구현 로직**:
```
1. connected_services 조회 시 is_active 필드 포함
2. is_active: false인 서비스 → 해당 ServiceCard 상단에 경고 배너 렌더링:
   - 텍스트: "{서비스명} 연결이 만료되었습니다"
   - 버튼: "재연결" → href="/api/auth/connect/{provider}"
3. is_active: true인 서비스 → 배너 없음 (정상 표시)
```

**사용자 경험 흐름**:
```
Worker가 OAuth refresh 실패 감지
  → DB: is_active = false 업데이트
  → 다음 번 /connections 방문 시
  → 배너 표시: "Google 연결이 만료되었습니다"
  → 재연결 클릭 → OAuth flow 재시작 → is_active = true 복구
```

---

### 2.2 Worker (Go)

#### 2.2.1 PM-02: Notion 토큰 조회 DB 쿼리

**파일**: `worker/internal/db/queries.go`

**새 메서드**: `DBStore.GetConnectedServiceByProvider(ctx, userID, provider)`

**목적**: Worker가 Notion MCP tool 실행 시 DB에서 access_token 조회

**구현 로직**:
```sql
SELECT id, user_id, service_name, encrypted_access_token, encrypted_refresh_token, expires_at, is_active
FROM connected_services
WHERE user_id = $1 AND service_name = $2
LIMIT 1
```

- 결과 없으면 `ErrNotFound` (또는 nil) 반환
- `ConnectedService` 구조체로 매핑 후 반환
- is_active=false인 경우도 반환 (호출부에서 처리)

---

#### 2.2.2 PM-03: 서비스 비활성화 DB 쿼리

**파일**: `worker/internal/db/queries.go`

**새 메서드**: `DBStore.UpdateServiceIsActive(ctx, serviceID, isActive)`

**목적**: OAuth refresh 실패 시 해당 서비스를 비활성화 마킹

**구현 로직**:
```sql
UPDATE connected_services SET is_active = $1 WHERE id = $2
```

---

#### 2.2.3 PM-03: OAuth 만료 마킹 래퍼 함수

**파일**: `worker/internal/oauth/token.go`

**새 함수**: `GetAccessTokenAndMarkExpiredOnFailure(ctx, pool, svc, client)`

**목적**: 기존 `GetAccessToken`의 래퍼. refresh 실패 시 자동으로 `is_active=false` 마킹

**구현 로직**:
```go
func GetAccessTokenAndMarkExpiredOnFailure(...) (string, error) {
    token, err := GetAccessToken(ctx, svc, client)
    if err != nil {
        // Best-effort: DB 업데이트 실패해도 원래 에러 반환
        _ = UpdateServiceIsActive(ctx, pool, svc.ID, false)
        return "", err
    }
    return token, nil
}
```

**설계 결정**:
- DB 업데이트는 best-effort (실패해도 원래 에러만 반환)
- Graceful degradation: DB 불안정 시에도 에러 전파에 영향 없음
- 성공 시 `UpdateServiceIsActive` 호출 안 함 (불필요한 DB 쓰기 방지)

---

## 3. 주요 아키텍처 결정

### 3.1 Notion OAuth vs Google OAuth 차이

| 항목 | Google | Notion |
|------|--------|--------|
| Token Exchange Auth | client_secret in body | Basic Auth (client_id:client_secret) |
| refresh_token | 있음 | 없음 (만료 안 됨) |
| 필수 파라미터 | - | `owner=user` |
| Token 만료 | 있음 | 없음 |

Notion token이 만료되지 않으므로 `encrypted_refresh_token`, `expires_at` 저장 불필요.

### 3.2 Rate Limiting 전략

**선택**: 직접 구현 (Redis INCR + EXPIRE) vs `@upstash/ratelimit` 패키지

**결정**: 직접 구현 (Fixed Window)
- 이유: 추가 패키지 의존성 없이 MVP 요구사항 충족
- 한계: Sliding Window가 아닌 Fixed Window → 윈도우 경계에서 2배 버스트 가능
- MVP 수준에서는 허용 가능한 트레이드오프

### 3.3 /api/auth/* Rate Limiting 제외

OAuth callback이 rate limiting에 걸리면 연결 flow가 끊김.
`/api/auth/connect/*/callback`은 외부 OAuth provider에서 오는 리다이렉트이므로 제외.

---

## 4. 테스트 결과

### 4.1 Worker Tests

| Package | Before | After | New Tests |
|---------|--------|-------|-----------|
| db | 13 | 20 | +7 (GetConnectedServiceByProvider 4, UpdateServiceIsActive 3) |
| oauth | 4 | 7 | +3 (GetAccessTokenAndMarkExpiredOnFailure 3) |
| 기타 | 101 | 101 | 0 |
| **합계** | **118** | **128** | **+10** |

**전체 Worker**: ✅ ALL PASS, 빌드 성공

### 4.2 Web Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| api/notion-connect.test.ts | 5 | ✅ PASS (신규) |
| api/notion-callback.test.ts | 7 | ✅ PASS (신규) |
| middleware-ratelimit.test.ts | 6 | ✅ PASS (신규) |
| connections.test.tsx (배너) | 4 | ✅ PASS (기존 파일에 추가) |
| 기존 테스트 | 356 | ✅ PASS (회귀 없음) |
| **합계** | **378** | **✅ ALL PASS** |

**Type-check**: ✅ PASS (에러 0)
**Lint**: ✅ 에러 0 (기존 warning 4개 — Sprint 8과 무관)

---

## 5. 남은 이슈 및 기술 부채

### 5.1 알려진 이슈
- Rate Limiting이 Fixed Window 방식 → 윈도우 경계에서 최대 2배 버스트 가능

### 5.2 기술 부채
- [ ] Rate Limiting: `@upstash/ratelimit` 패키지로 교체 시 정확한 Sliding Window 구현 가능
- [ ] Notion OAuth: Workspace ID/Name을 `connected_services`에 저장하지 않음 (향후 멀티 워크스페이스 지원 시 필요)
- [ ] Lint warning 4건 (기존): `<a>` → `<Link>`, `<img>` → `<Image>` 전환 필요

### 5.3 다음 Sprint 개선 사항
- PM-01: 온보딩 플로우 (5 SP) — 신규 가입 시 타임존/언어 초기 설정
- PM-07: BYOK API 키 등록/삭제 UI (3 SP)
- PM-08: 선호도 설정 UI (3 SP)

---

## 6. 스프린트 회고

### 6.1 잘된 점
1. **TDD Red-Green 순서 엄수**: Test Engineer → Feature Engineer 순차 진행
2. **병렬 작업 효율**: Web + Worker Feature Engineer 동시 구현
3. **기존 테스트 회귀 없음**: 378개 전체 통과

### 6.2 개선이 필요한 점
1. **worktree 브랜치 관리**: Web Engineer가 `feat/sprint-8-worker` 브랜치에 커밋 → 브랜치명 혼란
   - 원인: `isolation: "worktree"` 사용 시 env 미상속으로 Opus spawn, 브랜치 충돌 발생
   - 해결: 다음 Sprint부터 `isolation: "worktree"` 제거 → Sonnet spawn 보장 + 브랜치 명확화
2. **Orchestrator 모델**: Sonnet → Opus 변경 (settings.json 업데이트 완료)

### 6.3 배운 점
1. `isolation: "worktree"` 사용 시 `CLAUDE_CODE_SUBAGENT_MODEL` env 미상속 → Opus로 spawn됨
2. Notion OAuth는 HTTP Basic Auth 방식으로 token exchange (Google과 다름)
3. Notion access_token은 만료되지 않아 refresh 로직 불필요

---

## 7. 다음 Sprint 준비 (Sprint 9)

### 7.1 Sprint 9 후보 (P1 계속)
- PM-01: 온보딩 플로우 (5 SP)
- PM-07: BYOK API 키 등록/삭제 UI (3 SP)
- PM-08: 선호도 설정 UI (3 SP)
- **합계: 11 SP**

### 7.2 의존성
- PM-01 온보딩: 신규 가입 flow와 독립적으로 구현 가능
- PM-07, PM-08: Settings 페이지 기존 구현 기반 확장

---

## 8. 통계

### 8.1 Story Points
- Sprint 8 완료: 11 SP (PM-02 5 + PM-14 3 + PM-03 3)
- Post-MVP P1 누적: 26 SP / 57 SP (PM-04~06 Sprint 7 + PM-02/14/03 Sprint 8)

### 8.2 코드 변경
- **신규 파일**: 5개
  - `web/src/app/api/auth/connect/notion/route.ts`
  - `web/src/app/api/auth/connect/notion/callback/route.ts`
  - `web/src/lib/ratelimit.ts`
  - `web/src/__tests__/api/notion-connect.test.ts`
  - `web/src/__tests__/api/notion-callback.test.ts`
- **수정 파일**: 4개
  - `web/src/middleware.ts` (+32 lines)
  - `web/src/app/(dashboard)/connections/page.tsx` (+41 lines)
  - `worker/internal/db/queries.go` (+29 lines)
  - `worker/internal/oauth/token.go` (+17 lines)

### 8.3 테스트 커버리지
- **Web**: 356 → 378 (+22)
- **Worker**: 118 → 128 (+10)
- **전체**: 474 → 506 (+32)

---

**Sprint 8 완료** ✅

다음: Sprint 9 (PM-01 온보딩 + PM-07 BYOK UI + PM-08 선호도 설정)
