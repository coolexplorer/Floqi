# Technical Debt Backlog

> Sprint 1 완료 후 식별된 기술 부채 및 개선 사항 추적
> 우선순위: P0 (Critical) > P1 (High) > P2 (Medium) > P3 (Low)

---

## Sprint 1 기술 부채

### TD-001: Dynamic Import for Crypto Module

**우선순위**: P3 (Low)

**현상**:
- `@/lib/crypto`를 top-level import 시 vitest mock hoisting 순서 이슈 발생
- `vi.mock()` factory가 실제 import보다 먼저 실행되어야 하는데 순서가 꼬임

**현재 대응**:
```typescript
// callback/route.ts
const { encrypt } = await import('@/lib/crypto');  // Dynamic import
```

**영향**:
- 코드 가독성 약간 저하
- 성능 영향 미미 (첫 호출 시에만 dynamic load)
- 기능 동작에는 문제 없음

**해결 방안**:
- Vitest v3.x에서 mock hoisting 개선 예정 → 업그레이드 후 재검토
- 또는 `vi.hoisted()` API 사용 검토

**예상 소요**: 1 SP

**타겟 Sprint**: Sprint 6 (여유 시간)

**관련 파일**:
- `web/src/app/api/auth/connect/google/callback/route.ts:73`

---

### TD-002: Lint Warnings (Next.js Best Practices)

**우선순위**: P2 (Medium)

**항목**:

1. **`<a>` → `<Link>` 변환**:
   - `web/src/app/(dashboard)/automations/page.tsx:130`
   - `web/src/components/layout/TopNavBar.tsx:60`
   - Warning: `@next/next/no-html-link-for-pages`

2. **`<img>` → `<Image>` 변환**:
   - `web/src/components/ui/Avatar.tsx:58`
   - Warning: `@next/next/no-img-element`

**영향**:
- 성능 최적화 기회 미활용
- LCP (Largest Contentful Paint) 개선 가능
- Bandwidth 절약 가능 (next/image automatic optimization)

**해결 방안**:
```typescript
// Before
<a href="/automations/new/">+ Add Automation</a>

// After
import Link from 'next/link';
<Link href="/automations/new">+ Add Automation</Link>
```

```typescript
// Before
<img src={src} alt={alt} />

// After
import Image from 'next/image';
<Image src={src} alt={alt} width={32} height={32} />
```

**예상 소요**: 2 SP

**타겟 Sprint**: Sprint 2-3

**관련 파일**:
- `web/src/app/(dashboard)/automations/page.tsx`
- `web/src/components/layout/TopNavBar.tsx`
- `web/src/components/ui/Avatar.tsx`

---

### TD-003: Test Mock Duplication

**우선순위**: P3 (Low)

**현상**:
- 여러 테스트 파일에서 동일한 Supabase mock 패턴 반복
- DRY 원칙 위반

**예시**:
```typescript
// connections.test.tsx
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({ /* ... */ }),
  }),
}));

// oauth-callback.test.ts
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  })),
}));
```

**해결 방안**:
- `web/src/test/mocks/supabase.ts` 공통 mock 유틸 생성
- Factory 함수 제공: `createMockSupabaseClient(overrides?)`

**예상 구조**:
```typescript
// web/src/test/mocks/supabase.ts
export function createMockSupabaseClient(overrides = {}) {
  return {
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      ...overrides.auth,
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn(),
      insert: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      ...overrides.from,
    }),
  };
}
```

**예상 소요**: 2 SP

**타겟 Sprint**: Sprint 3-4 (테스트 인프라 개선 시점)

**관련 파일**:
- `web/src/__tests__/connections.test.tsx`
- `web/src/__tests__/oauth-callback.test.ts`
- `web/src/__tests__/signup.test.tsx`
- `web/src/__tests__/login.test.tsx`

---

## 알려진 이슈 (Post-Sprint 1)

### ISSUE-001: OAuth Token Refresh 로직 미구현

**우선순위**: P1 (High)

**현상**:
- 현재: access token 암호화 저장만 구현
- access token 만료 (1시간) 시 수동 재연결 필요
- refresh token은 저장하지만 자동 갱신 로직 없음

**영향**:
- 사용자 경험 저하 (1시간마다 재연결 요구)
- 자동화 실행 실패 가능 (token expired)

**해결 방안**:
- Sprint 3 Worker에서 구현
- `worker/internal/oauth/token.go`: `RefreshAccessToken()` 함수
- `expires_at` 확인 → 만료 5분 전 자동 refresh
- Web에서는 token 사용 시 자동 갱신 트리거

**예상 소요**: 5 SP

**타겟 Sprint**: Sprint 3 (Execution Engine 구현 시 필수)

**관련 US**: US-205

**관련 TC**: TC-2014~2016

---

### ISSUE-002: "Forgot Password" 기능 미구현

**우선순위**: P2 (Medium)

**현상**:
- Login 페이지에 "Forgot password?" 링크만 존재 (Phase 1 P1)
- 실제 비밀번호 재설정 기능 없음

**영향**:
- 비밀번호 분실 시 계정 복구 불가
- 사용자 지원 부담 증가

**해결 방안**:
- Supabase `resetPasswordForEmail()` API 사용
- `/forgot-password` 페이지 생성
- 이메일 전송 → 재설정 링크 → `/reset-password?token=xxx`

**예상 소요**: 3 SP

**타겟 Sprint**: Post-MVP (Sprint 7+)

**관련 US**: 신규 US 필요

---

### ISSUE-003: Service 연결 해제 확인 Modal 미구현

**우선순위**: P1 (High)

**현상**:
- Connections 페이지에서 "연결 해제" 버튼 클릭 시 즉시 삭제
- 확인 Modal 없음 (테스트에서만 mock)

**영향**:
- 실수로 연결 해제 가능 (UX 저하)
- 연결 해제 시 관련 자동화도 paused 전환 필요 (사용자 인지 필요)

**해결 방안**:
- Modal 컴포넌트 사용하여 확인 UI 추가
- "정말 연결을 해제하시겠습니까?" 메시지
- 관련 자동화 개수 표시 (예: "3개 자동화가 일시정지됩니다")

**예상 소요**: 2 SP

**타겟 Sprint**: Sprint 2 (S2-WEB-02에 포함)

**관련 US**: US-204

**관련 TC**: TC-2011~2013

---

### ISSUE-004: Google 외 다른 서비스 연결 미구현

**우선순위**: P2 (Medium)

**현상**:
- Connections 페이지에 Notion, Slack, GitHub placeholder 카드만 존재
- 실제 OAuth flow 구현 없음

**영향**:
- MVP 기능 제한 (Google만 사용 가능)
- 템플릿 확장 제약 (Notion, Slack 필요)

**해결 방안**:
- 아키텍처는 이미 확장 가능하게 설계됨 (`service_name`, `scopes` 컬럼)
- Notion OAuth 2.0: `/api/auth/connect/notion` route 추가
- Slack OAuth 2.0: `/api/auth/connect/slack` route 추가
- GitHub OAuth 2.0: `/api/auth/connect/github` route 추가

**예상 소요**: 8 SP (서비스당 2 SP)

**타겟 Sprint**: Sprint 4-5 (Reading Digest, Smart Save 템플릿 구현 전)

**관련 US**: US-202 (다른 서비스 연결)

---

### ISSUE-005: OAuth Scope 설명 간결화 (일부 완료)

**우선순위**: P3 (Low)

**현상**:
- ServiceCard에 SCOPE_LABELS로 일부 개선됨
- 일부 scope는 여전히 긴 URL 형태

**현재 상태**:
```typescript
const SCOPE_LABELS: Record<string, string> = {
  'https://www.googleapis.com/auth/gmail.readonly': 'Gmail 읽기',
  'https://www.googleapis.com/auth/gmail.send': 'Gmail 전송',
  'https://www.googleapis.com/auth/calendar.readonly': 'Calendar 읽기',
};
```

**개선 방안**:
- 모든 scope에 대한 한글 설명 추가
- 카테고리별 그룹핑 (Gmail, Calendar, Drive 등)
- 아이콘 추가 (lucide-react)

**예상 소요**: 1 SP

**타겟 Sprint**: Sprint 3 (여유 시간)

---

## 우선순위별 요약

| 우선순위 | 항목 | 타겟 Sprint | 예상 SP |
|---------|------|-------------|---------|
| **P1 (High)** | ISSUE-001: OAuth Token Refresh | Sprint 3 | 5 |
| **P1 (High)** | ISSUE-003: 연결 해제 확인 Modal | Sprint 2 | 2 |
| **P2 (Medium)** | TD-002: Lint Warnings | Sprint 2-3 | 2 |
| **P2 (Medium)** | ISSUE-002: Forgot Password | Post-MVP | 3 |
| **P2 (Medium)** | ISSUE-004: 다른 서비스 연결 | Sprint 4-5 | 8 |
| **P3 (Low)** | TD-001: Dynamic Import | Sprint 6 | 1 |
| **P3 (Low)** | TD-003: Test Mock 중복 | Sprint 3-4 | 2 |
| **P3 (Low)** | ISSUE-005: Scope 설명 간결화 | Sprint 3 | 1 |

**총 예상 SP**: 24 SP

---

## Sprint 2 포함 항목

Sprint 2에서 처리할 기술 부채 및 이슈:

1. **ISSUE-003: 연결 해제 확인 Modal** (P1, 2 SP)
   - S2-WEB-02에 통합
   - 관련 자동화 개수 표시 기능 포함

2. **TD-002 (일부): Lint Warnings - automations 페이지** (P2, 1 SP)
   - S2-WEB-04~07 작업 시 함께 수정
   - `<a>` → `<Link>` 변환

**Sprint 2 추가 SP**: 3 SP (40 SP → 43 SP)

---

**마지막 업데이트**: 2026-03-06
**담당**: Main Assistant (Orchestrator)
