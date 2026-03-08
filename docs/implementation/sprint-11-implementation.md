# Sprint 11 구현 문서

> **기간**: Week 11 (Post-MVP P2)
> **목표**: Dashboard 고급 통계, Output Format, 계정 삭제, Stripe Customer Portal
> **완료일**: 2026-03-07

---

## 1. 개요

### 1.1 스프린트 목표
- PM-16: Dashboard 고급 통계 차트 (실행 추이, 성공률)
- PM-17: Automation Output Format 설정 (email / notion / both)
- PM-18: 계정 삭제 기능 (버튼 + 확인 모달 + API)
- PM-19: Stripe Customer Portal (Manage Plan → 결제 관리)

### 1.2 완료된 Product Items
- PM-16: Dashboard Advanced Stats (4 SP)
- PM-17: Output Format (4 SP)
- PM-18: Account Deletion (4 SP)
- PM-19: Stripe Customer Portal (4 SP)

### 1.3 완료된 Test Cases
- TC-6010: Dashboard 차트 표시 (실행 추이 + 성공률)
- TC-6011: 차트 데이터 정확성 (DB 집계 ↔ 차트 데이터)
- TC-7011: Automation Edit 페이지에 output format 선택
- TC-7012: Notion 미연결 시 경고 메시지
- TC-7013: 계정 삭제 버튼 및 확인 모달
- TC-7014: 계정 삭제 확인 → DELETE /api/account 호출
- PM-19: Pro 사용자 Manage Plan → Stripe Customer Portal

---

## 2. 컴포넌트별 구현 사항

### 2.1 Supabase / Infra

#### 2.1.1 마이그레이션 008: output_format 컬럼 추가
- **파일**: `supabase/migrations/008_add_output_format.sql`
- **목적**: automations 테이블에 출력 형식 컬럼 추가
- **주요 내용**:
  - `ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS output_format TEXT DEFAULT 'email'`
  - 기본값 'email' — 기존 자동화는 변경 없이 이메일 출력 유지
  - 허용 값: 'email', 'notion', 'both'

---

### 2.2 Worker (Go)

#### 2.2.1 시스템 프롬프트에 Output Format 반영
- **파일**: `worker/internal/agent/prompt.go`
- **목적**: AI Agent 시스템 프롬프트에 사용자의 출력 형식 설정 반영
- **주요 변경**:
  - `UserProfile` 구조체에 `OutputFormat string` 필드 추가
  - `buildSystemPrompt()` 함수에서 `OutputFormat` 값이 있으면 `Output format: {value}` 라인 추가
- **구현 로직**:
  ```
  - UserProfile.OutputFormat이 빈 문자열이 아닌 경우에만 프롬프트에 포함
  - "Output format: email" / "Output format: notion" / "Output format: both" 형태로 출력
  - 기존 timezone, language, news categories 라인 뒤에 삽입
  - AI Agent가 이 정보를 기반으로 결과를 적절한 채널로 전달
  ```

#### 2.2.2 Worker 테스트
- **파일**: `worker/internal/agent/prompt_test.go`
- **테스트 수**: 13개 (모두 통과)
- **커버리지**: Output Format 관련 3개 테스트 추가
  - `OutputFormat_email`: email 설정 시 "Output format: email" 포함 확인
  - `OutputFormat_notion`: notion 설정 시 프롬프트 반영 확인
  - `OutputFormat_empty`: 빈 값이면 Output format 라인 미포함 확인

---

### 2.3 Web (Next.js)

#### 2.3.1 PM-16: Dashboard 차트
- **파일**: `web/src/app/(dashboard)/page.tsx`
- **목적**: 대시보드에 실행 추이 차트와 성공률 차트 추가
- **주요 기능**:
  1. **Execution Trend Chart** (`data-testid="execution-trend-chart"`):
     - 기존 `recentLogs`를 날짜별로 그룹화하여 일별 실행 횟수 표시
     - div 기반 바 차트 (각 바에 `data-chart-point` 속성)
     - 날짜 레이블 하단 표시
  2. **Success Rate Chart** (`data-testid="success-rate-chart"`):
     - 성공률 퍼센트를 큰 숫자로 표시
     - 기존 `stats.successRate` 값 활용
- **구현 로직**:
  ```
  - stats가 로드된 후에만 차트 섹션 렌더링 (null 가드)
  - recentLogs를 순회하며 created_at의 날짜(toLocaleDateString)별로 카운트 집계
  - Object.entries()로 변환 후 각 날짜별 바 렌더링
  - 바 높이: count * 40px (최소 20px)
  - 성공률: stats.successRate 숫자와 % 기호를 별도 span으로 분리
  - recharts 패키지 설치했으나 jsdom 환경에서 SVG 렌더링 이슈로 div 기반 구현 채택
  ```

#### 2.3.2 PM-17: Output Format 선택
- **파일**: `web/src/app/(dashboard)/automations/[id]/edit/page.tsx`
- **목적**: 자동화 편집 페이지에 출력 형식 선택 드롭다운 추가
- **주요 변경**:
  1. `AutomationData` 인터페이스에 `output_format: string | null` 추가
  2. `outputFormat` / `notionConnected` 상태 추가
  3. `<select data-testid="output-format-select">` 드롭다운 (email / notion / both)
  4. 저장 시 `output_format` 필드 포함
  5. Notion 연결 상태 체크 → 미연결 시 경고 메시지
- **구현 로직**:
  ```
  - load() 함수에서 supabase.auth.getUser()로 사용자 정보 조회
  - automations 테이블에서 output_format 값 로드 (기본값 'email')
  - connections 테이블에서 service='notion'인 레코드 조회
    → 데이터 존재 시 notionConnected = true
  - outputFormat이 'notion' 또는 'both'이고 notionConnected가 false일 때
    → "Notion 연결이 필요합니다. Connect Notion first." 경고 표시
  - handleSave()에서 output_format을 API/Supabase 저장 페이로드에 포함
  ```

#### 2.3.3 PM-18: 계정 삭제
- **파일**: `web/src/app/(dashboard)/settings/page.tsx`
- **목적**: Settings 페이지에 계정 삭제 기능 추가
- **주요 변경**:
  1. `useRouter` 추가 (리다이렉트용)
  2. `showDeleteModal` / `deleteError` 상태 추가
  3. "Danger Zone" 섹션에 "Delete Account" 버튼 추가
  4. 확인 모달: 경고 텍스트 + Confirm/Cancel 버튼
  5. Confirm 시 `DELETE /api/account` → 성공 시 `/login` 리다이렉트
- **구현 로직**:
  ```
  - "Delete Account" 버튼 클릭 → showDeleteModal = true
  - 모달 경고문: "Are you sure? This action cannot be undone."
  - Cancel 클릭 → showDeleteModal = false (모달 닫힘)
  - Confirm 클릭 →
    1. fetch('/api/account', { method: 'DELETE' }) 호출
    2. res.ok → router.push('/login') 리다이렉트
    3. !res.ok → deleteError 설정 후 모달 닫힘
    4. catch → deleteError = 'Failed to delete account'
  - 기존 BYOK Switch Modal의 Confirm/Cancel 버튼과 충돌 방지:
    각 모달은 독립적인 showSwitchModal / showDeleteModal 상태로 관리
  ```

#### 2.3.4 PM-19: Stripe Customer Portal
- **파일**: `web/src/app/(dashboard)/settings/page.tsx`
- **목적**: Pro 사용자의 "Manage Plan" 버튼에 Stripe Customer Portal 연동
- **주요 변경**:
  - 기존 stub 버튼에 `onClick` 핸들러 추가
  - `POST /api/billing/portal` 호출 → Stripe Portal URL로 리다이렉트
- **구현 로직**:
  ```
  - "Manage Plan" 클릭 시:
    1. billingError 초기화
    2. fetch('/api/billing/portal', { method: 'POST' }) 호출
    3. 성공: window.location.href = data.url (Stripe Portal로 이동)
    4. 실패: billingError = data.error || 'Failed to open billing portal'
    5. catch: billingError = 'Failed to open billing portal'
  - 기존 billingError 표시 UI 재활용
  ```

---

### 2.4 API Routes

#### 2.4.1 POST /api/billing/portal
- **파일**: `web/src/app/api/billing/portal/route.ts`
- **목적**: Stripe Customer Portal 세션 생성
- **구현 로직**:
  ```
  1. Server-side Supabase 클라이언트로 현재 사용자 확인
  2. profiles 테이블에서 stripe_customer_id 조회
  3. stripe_customer_id 없으면 400 에러 반환
  4. stripe.billingPortal.sessions.create() 호출
     - customer: 프로필의 stripe_customer_id
     - return_url: /settings 페이지로 복귀
  5. 생성된 session.url 반환
  ```

#### 2.4.2 DELETE /api/account
- **파일**: `web/src/app/api/account/route.ts`
- **목적**: 사용자 계정 및 모든 관련 데이터 삭제
- **구현 로직**:
  ```
  1. Server-side Supabase 클라이언트로 현재 사용자 확인
  2. Admin 클라이언트 생성 (service_role 키 — RLS 바이패스 필요)
  3. 순차적으로 관련 데이터 삭제:
     - execution_logs (실행 로그)
     - automations (자동화)
     - connections (서비스 연결)
     - profiles (프로필)
  4. auth.admin.deleteUser()로 인증 사용자 삭제
  5. 성공: { success: true } 반환
  - 삭제 순서가 중요: FK 제약 조건 고려하여 의존 테이블부터 삭제
  - Admin 클라이언트 사용 이유: RLS 정책은 DELETE를 허용하지 않을 수 있으므로
    service_role로 직접 삭제
  ```

---

## 3. 주요 아키텍처 결정

### 3.1 차트 구현 방식
- **결정**: recharts 대신 div 기반 바 차트 사용
- **이유**:
  - jsdom 테스트 환경에서 SVG 렌더링 제한
  - 현재 요구사항 수준에서 라이브러리 불필요
  - 테스트 가능성 우선 (data-chart-point 속성으로 검증)
- **향후**: 프로덕션에서 더 복잡한 차트 필요 시 recharts 활용 가능 (이미 설치됨)

### 3.2 계정 삭제 시 데이터 정리 순서
- **결정**: 관련 테이블을 명시적으로 순차 삭제 후 Auth 사용자 삭제
- **이유**:
  - FK 제약 조건 위반 방지 (execution_logs → automations 참조)
  - CASCADE DELETE가 모든 테이블에 설정되지 않았을 수 있음
  - 명시적 삭제로 누락 방지
- **순서**: execution_logs → automations → connections → profiles → auth.users

### 3.3 Output Format — Notion 연결 체크
- **결정**: 클라이언트에서 connections 테이블 직접 조회
- **이유**:
  - 별도 API 엔드포인트 없이 기존 Supabase 클라이언트 활용
  - 편집 페이지 로드 시 1회 조회로 충분
  - 서버사이드 검증은 실행 시점(Worker)에서 수행

---

## 4. 테스트 결과

### 4.1 Web Tests (Vitest)
| Test File | Tests | Status |
|-----------|-------|--------|
| dashboard-charts.test.tsx | 7 | Pass |
| output-format.test.tsx | 7 | Pass |
| account-deletion.test.tsx | 7 | Pass |
| billing-portal.test.tsx | 4 | Pass |
| (기존 37개 파일) | 441 | Pass |
| **Total** | **466** | **All Pass** |

### 4.2 Worker Tests (Go)
| Package | Tests | Status |
|---------|-------|--------|
| agent (prompt_test.go) | 13 | Pass |
| billing | 9 | Pass |
| (기타 기존 패키지) | All | Pass |

### 4.3 Quality Checks
| Check | Result |
|-------|--------|
| ESLint | 0 errors (6 pre-existing warnings) |
| TypeScript type-check | Clean |
| Next.js build | Success |
| Go tests | All pass |

---

## 5. 변경된 파일 목록

### 신규 파일
| 파일 | 목적 |
|------|------|
| `supabase/migrations/008_add_output_format.sql` | output_format 컬럼 추가 |
| `web/src/app/api/billing/portal/route.ts` | Stripe Customer Portal API |
| `web/src/app/api/account/route.ts` | 계정 삭제 API |
| `web/src/__tests__/dashboard-charts.test.tsx` | Dashboard 차트 테스트 |
| `web/src/__tests__/output-format.test.tsx` | Output Format 테스트 |
| `web/src/__tests__/account-deletion.test.tsx` | 계정 삭제 테스트 |
| `web/src/__tests__/billing-portal.test.tsx` | Billing Portal 테스트 |
| `worker/internal/agent/prompt_test.go` | Agent Prompt 테스트 |

### 수정된 파일
| 파일 | 변경 내용 |
|------|-----------|
| `web/src/app/(dashboard)/page.tsx` | 차트 섹션 추가 |
| `web/src/app/(dashboard)/automations/[id]/edit/page.tsx` | Output Format 선택 + Notion 연결 체크 |
| `web/src/app/(dashboard)/settings/page.tsx` | Manage Plan 핸들러 + Delete Account 섹션 |
| `worker/internal/agent/prompt.go` | OutputFormat 필드 + 프롬프트 반영 |
| `web/package.json` | recharts 의존성 추가 |

---

## 6. 남은 이슈 및 기술 부채

### 6.1 알려진 이슈
- recharts 설치되었으나 미사용 (div 기반 차트 사용 중) — 프로덕션에서 교체 고려

### 6.2 기술 부채
- 계정 삭제 시 Stripe 구독 취소 미처리 (향후 추가 필요)
- Output Format 변경 시 서버사이드 유효성 검증 미구현 (Worker 실행 시점에서만 체크)

### 6.3 다음 스프린트 개선 사항
- Stripe 구독 취소를 계정 삭제 플로우에 통합
- 차트를 recharts로 교체하여 인터랙티브 기능 추가

---

## 7. 스프린트 회고

### 7.1 잘된 점
- TDD 사이클 준수: 25개 테스트 먼저 작성 (Red) → 구현 (Green) → 전체 466개 통과
- Worker와 Web 작업을 병렬로 진행하여 효율적 완료
- 기존 Settings 페이지 구조를 활용하여 최소 변경으로 기능 추가

### 7.2 개선이 필요한 점
- recharts를 설치했으나 jsdom 호환성 문제로 미사용 — 사전 조사 필요
- 모달이 2개(BYOK Switch + Delete Account)로 늘어남 — 공통 Modal 컴포넌트 추출 고려

### 7.3 배운 점
- jsdom에서 SVG 기반 차트 라이브러리 테스트 제약 — div 기반 대안이 테스트에 더 적합
- 계정 삭제 시 FK 순서가 중요 — 의존 테이블부터 삭제해야 함
