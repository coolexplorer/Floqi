# Floqi — AI Personal Autopilot

## Project Overview

**Floqi**는 사용자의 일상 워크플로우를 자동화하는 AI Personal Autopilot 서비스입니다.

### Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase Auth
- **Backend Worker**: Go 1.23 (Goroutines, Asynq, MCP SDK)
- **Database**: Supabase (PostgreSQL) + RLS
- **Queue**: Upstash Redis (Asynq)
- **AI/LLM**: Anthropic Claude API (Tool Use)
- **MCP Tools**: Gmail, Google Calendar, Notion, News API, Weather API
- **Deployment**: Vercel (Web) + Fly.io (Worker)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              CLIENT LAYER (Next.js 15 on Vercel)                │
│  Landing → Dashboard → Automations → Logs → Settings            │
│  Supabase Auth + REST API + Webhook Receiver → Redis            │
└────────────────────────────┬────────────────────────────────────┘
                             │ Redis (Upstash) + PostgreSQL (Supabase)
┌────────────────────────────▼────────────────────────────────────┐
│           WORKER LAYER (Go on Fly.io)                           │
│  Scheduler (Cron) → Job Queue (Asynq) → Agent Executor (LLM)   │
│  MCP Tools: Gmail | Calendar | Notion | News | Weather         │
└─────────────────────────────────────────────────────────────────┘
```

### MVP Goal (6 Weeks)

5개 핵심 자동화 템플릿 제공:
1. **Morning Briefing**: 오늘 일정 + 중요 이메일 + 날씨 요약 이메일
2. **Email Triage**: 미읽은 이메일 긴급/중요/참고 분류
3. **Reading Digest**: 관심 분야 뉴스 요약 → Notion/이메일
4. **Weekly Review**: 한 주간 활동 정리
5. **Smart Save**: 특정 이메일/뉴스 → Notion 자동 저장

---

## Conventions

### Commits (Conventional Commits)

| Prefix | Example |
|--------|---------|
| `feat:` | `feat: add morning briefing template` |
| `fix:` | `fix: handle expired OAuth token refresh` |
| `docs:`, `test:`, `refactor:`, `chore:` | `test: add tool use loop integration tests` |

### Branches

`feat/<name>`, `fix/<name>`, `refactor/<name>`, `test/<name>`

**Example**: `feat/google-oauth-connection`, `fix/cron-dispatcher-race-condition`

---

## Core Development Principles (MANDATORY)

**모든 새 기능 구현 시 필수 준수 사항:**

### 1. TDD (Test-Driven Development)

- ✅ **테스트 먼저 작성** → 기능 구현 순서 엄수
- ❌ 구현 후 테스트 작성 금지
- Red (실패하는 테스트) → Green (통과하는 최소 구현) → Refactor

### 2. 동작 검증 필수

- 모든 코드 변경 시 **즉시 동작 확인**
- 구현 중간중간 테스트 실행으로 검증
- 기능 완성 전까지 **green 상태 유지**

### 3. 간결한 구현 & 베스트 프랙티스

- **KISS** (Keep It Simple, Stupid): 불필요한 추상화 금지
- **YAGNI** (You Aren't Gonna Need It): 미래를 위한 코드 작성 금지
- **DRY** (Don't Repeat Yourself): 중복 최소화
- 언어/프레임워크 컨벤션 준수 (Go: Effective Go, TS: strict mode)
- 네이밍: 명확하고 의미 전달 (약어 최소화)

### 4. Scope 엄수

- ✅ 정의된 요구사항만 구현
- ❌ 요구하지 않은 기능 추가 금지 (no gold-plating)
- ❌ "나중을 위한" 확장성 고려 금지
- ❌ 불필요한 설정 옵션 추가 금지
- Scope 외 개선사항은 별도 이슈로 제안

### 5. 구현 순서 (TDD Cycle)

```
1. 실패하는 테스트 작성 (Red)
2. 테스트 통과하는 최소 코드 작성 (Green)
3. 코드 정리 및 리팩토링 (Refactor)
4. 반복 (다음 테스트 케이스)
```

### 6. 완료 기준 (Definition of Done)

- [ ] 모든 테스트 통과 (unit + integration + E2E)
- [ ] 코드 리뷰 기준 충족 (lint, type-check)
- [ ] Test Coverage threshold 충족 (80%+)
- [ ] 요구사항 100% 구현 (scope 내)
- [ ] 문서 업데이트 (필요 시)

---

## Agent Team Operations

### Organization

```
Main Assistant (Orchestrator) — Direct team management
  ├─ CEO AI (startup-ceo-advisor) — Strategy (rarely needed)
  ├─ CTO AI (startup-cto-advisor) — Architecture decisions (rarely needed)
  ├─ COO AI (startup-coo) — Operations research (rarely needed)
  └─ Dynamic teammates (spawned per task)
      ├─ Backend Engineer (Go Worker development)
      ├─ Frontend Engineer (Next.js development)
      ├─ Test Engineer (Unit/Integration/E2E tests)
      └─ DevOps Engineer (Deployment, infra)
```

**CRITICAL**: Main Assistant acts as Orchestrator directly.
- ❌ NEVER spawn engineer-team-leader agent
- ✅ Main Assistant directly: TeamCreate → Task spawn → Verify → TeamDelete
- ✅ Follow TDD: spawn Test Engineer BEFORE Feature Engineer

### Orchestrator Role (You)

As Orchestrator, you **DO NOT write code directly**. Your role: Plan → Team → Delegate → Verify → Integrate.

**Workflow**:
```
User Request → Analyze → Break down tasks + dependency map → User approval (if ambiguous)
            → Spawn agents (parallel/sequential) → Validate results → Integrate → Report
```

**Delegation Requirements**:
- Task: 1 sentence description
- Input: Context (files, user stories, test cases)
- Output format: What deliverable expected
- Constraints: Technical limits, dependencies
- Success criteria: Clear pass/fail conditions

**Delegation Mistakes to Avoid**:
- ❌ Vague instructions ("implement the feature")
- ❌ 1 delegation = 2+ independent tasks
- ❌ Asking agents to communicate with each other
- ❌ Implementing yourself instead of delegating

### Dynamic Team Composition

| Task Type | subagent_type | model | Notes |
|-----------|---------------|-------|-------|
| Go Backend (MCP, Agent, Scheduler) | `general-purpose` | sonnet | Use `isolation: "worktree"` |
| Next.js Frontend (UI, API Routes) | `general-purpose` | sonnet | Use `isolation: "worktree"` |
| Test Writing (Unit/Integration/E2E) | `general-purpose` | sonnet | **Spawn FIRST** in TDD |
| Verification (lint, type-check, build) | `general-purpose` | haiku | Run after implementation |
| Codebase Exploration | `Explore` | haiku | Read-only, no edits |

**TDD Requirement**: Always spawn Test Engineer → Feature Engineer (in order or parallel with explicit instructions)

### Team Lifecycle

```
1. TeamCreate(team_name="floqi-sprint-X")
2. TaskCreate(tasks...) — Optional, for tracking
3. Task(subagent_type="general-purpose", model="sonnet", isolation="worktree", ...)
   → Spawn multiple agents in parallel when possible
4. Wait for agents to complete (auto-notification)
5. Run verification commands directly (npm run test, go test, etc.)
6. SendMessage(type="shutdown_request", recipient=each_agent)
7. TeamDelete()
```

**Important**:
- Teammates go idle after every turn — this is normal
- Messages from teammates are automatically delivered to you
- Do NOT manually check inbox — the system delivers messages to you

### Validation Rules

After agents complete:
1. **Format check**: Output matches expected structure
2. **Success criteria**: All conditions met
3. **Interface compatibility**: APIs/types align
4. **Run tests**: Execute test commands directly via Bash
   - Go: `go test ./... -v`
   - Next.js: `npm run test`, `npm run type-check`, `npm run lint`

**Failure Handling**:
- 1st failure: Provide specific instructions, re-delegate
- 2nd consecutive failure: Report to user, ask for guidance

### Communication Format

**Progress updates**:
- `[Sprint 1] [2/5 완료] Google OAuth 연결 완료`
- Keep internal processing summaries brief

**Errors**:
- Root cause (1 line) + Solution (1 line)
- Example: "Test failed: missing env var → Added TOKEN_ENCRYPTION_KEY to .env.local"

## Context & Token Management (MANDATORY)

**모든 에이전트가 반드시 따라야 하는 규칙.**

### Orchestrator 토큰 규칙

1. **팀 크기**: MAX 3명 (초과 시 토큰 급증)
2. **팀원 모델**: sonnet 또는 haiku만 사용 (Opus 금지)
3. **프롬프트**: 필수 컨텍스트만 포함
   - Provide: User Story ID, Test Case IDs, relevant file paths
   - Do NOT: Send entire TDD, Sprint Backlog, or Test Cases document
4. **병렬 spawn**: 독립 작업은 단일 메시지에 여러 Task 호출로 병렬 실행
5. **컴팩션**: 15턴 초과 시 `/compact [현재 작업 요약]`
6. **종료**: 팀원 완료 즉시 `shutdown_request` (idle 최소화)

### Teammate 토큰 규칙

1. **파일 읽기**: 필요한 파일만
   - ❌ `node_modules`, `.next`, `dist`, `go.sum`
   - ✅ Source files directly related to the task
2. **탐색**: Glob/Grep 3회 이내. 실패 시 Explore 에이전트 사용
3. **출력**: 코드 작성 → 검증 → 결과 보고. 불필요한 설명 금지
4. **격리**: 코드 변경 시 `isolation: "worktree"` 필수
5. **재읽기 금지**: 이미 읽은 파일은 라인 번호 참조

### Context Recovery

1. `/compact Focus on [Sprint X Task Y]` → 2. 진행 중 작업 완료 → 3. 필요 시 새 세션 (커밋 후)

---

## Sprint Plan (6-Week MVP)

Reference documents:
- `docs/user-stories.md` — 46 User Stories across 9 Epics
- `docs/test-cases.md` — 157 Test Cases
- `docs/sprint-backlog.md` — Detailed task breakdown (266 Story Points)

### Sprint Schedule

| Sprint | Dates | Goal | Key Deliverables |
|--------|-------|------|------------------|
| **Sprint 1** | Week 1 | Auth + Google Connection + Security | 회원가입/로그인, Google OAuth, 토큰 암호화, RLS |
| **Sprint 2** | Week 2 | Connection Management + Automation CRUD | 서비스 연결 관리, 자동화 생성/목록/삭제/토글 |
| **Sprint 3** | Week 3 | Execution Engine + 2 Core Templates | AI Agent Tool Use, Morning Briefing, Email Triage |
| **Sprint 4** | Week 4 | Reading Digest + Execution Logs | 3번째 템플릿, 실행 로그 UI |
| **Sprint 5** | Week 5 | Schedule Settings + Landing Page | 크론 설정 UI, 랜딩 페이지 |
| **Sprint 6** | Week 6 | Profile Settings + Integration Tests + Deployment | 전체 E2E, 버그 수정, Vercel + Fly.io 배포 |

### Current Sprint Focus

**Check `docs/sprint-backlog.md` for detailed task list of current sprint.**

When starting a new sprint:
1. Read the sprint section in `docs/sprint-backlog.md`
2. Identify which component(s) to work on (Web/Worker/Infra)
3. Create a team and delegate tasks following TDD order
4. Track progress with TaskCreate/TaskUpdate (optional but recommended)

### Sprint Workflow

```
Sprint Start:
  → Read sprint-backlog.md (current sprint section)
  → TeamCreate(team_name="floqi-sprint-X")
  → Break down tasks by component (Web, Worker, Infra)
  → TDD: Spawn Test Engineer FIRST
  → Spawn Feature Engineers in parallel (when independent)
  → Run verification (tests, lint, type-check)
  → SendMessage(shutdown_request to all)
  → TeamDelete()
  → Commit with conventional commit message
  → Create sprint implementation documentation (MANDATORY)
  → Report sprint progress + documentation to user

Sprint End:
  → Review sprint checklist in sprint-backlog.md
  → Ensure all Definition of Done criteria met
  → User reviews implementation documentation
  → Address user feedback if any
  → Tag sprint completion commit (e.g., v0.1.0-sprint1)
```

---

## Documentation Workflow (MANDATORY)

**모든 스프린트 완료 시 구현 문서 작성 필수.**

### Sprint Implementation Documentation

각 스프린트 종료 시 다음 문서를 **반드시 작성**:

**문서 위치**: `docs/implementation/sprint-{N}-implementation.md`

**파일명 예시**:
- `docs/implementation/sprint-1-implementation.md`
- `docs/implementation/sprint-2-implementation.md`
- ...

### 문서 구조 (Template)

```markdown
# Sprint {N} 구현 문서

> **기간**: Week {N}
> **목표**: {Sprint Goal}
> **완료일**: YYYY-MM-DD

---

## 1. 개요

### 1.1 스프린트 목표
- {주요 목표 1}
- {주요 목표 2}
- ...

### 1.2 완료된 User Stories
- US-XXX: {User Story 제목} ✅
- US-YYY: {User Story 제목} ✅
- ...

### 1.3 완료된 Test Cases
- TC-XXXX: {Test Case 제목} ✅
- TC-YYYY: {Test Case 제목} ✅
- ...

---

## 2. 컴포넌트별 구현 사항

### 2.1 Supabase / Infra

#### 2.1.1 마이그레이션 파일
- **파일**: `supabase/migrations/001_create_profiles.sql`
- **목적**: 사용자 프로필 테이블 생성 및 RLS 정책 설정
- **주요 내용**:
  - profiles 테이블 생성
  - RLS 정책: users_own_data (auth.uid() = id)
  - 트리거: updated_at 자동 업데이트
- **구현 로직**:
  ```
  {한글로 상세 설명}
  - 테이블 생성 시 고려사항
  - RLS 정책 설정 이유
  - 트리거 동작 방식
  ```

#### 2.1.2 환경 변수 설정
- {환경 변수 목록 및 설명}

---

### 2.2 Web (Next.js)

#### 2.2.1 인증 플로우
- **파일**: `web/src/app/(auth)/signup/page.tsx`
- **목적**: 회원가입 UI 및 유효성 검증
- **주요 기능**:
  - 이메일/비밀번호 입력 폼
  - 유효성 검증 (이메일 형식, 비밀번호 8자 이상)
  - Supabase Auth API 연동
- **구현 로직** (한글):
  ```
  {상세 설명}
  - 폼 상태 관리 방식 (useState vs react-hook-form)
  - 유효성 검증 로직
  - 에러 핸들링 방식
  - 성공 시 리다이렉트 처리
  ```
- **관련 파일**:
  - `web/src/lib/supabase/client.ts` — Supabase 클라이언트 설정
  - `web/src/components/auth/signup-form.tsx` — 폼 컴포넌트

#### 2.2.2 Google OAuth 연결
- **파일**: `web/src/app/api/auth/connect/google/route.ts`
- **목적**: Google OAuth 인증 플로우 시작
- **구현 로직** (한글):
  ```
  {상세 설명}
  - OAuth consent URL 생성
  - scopes 설정 (gmail.readonly, calendar.readonly)
  - state 파라미터를 통한 CSRF 방지
  - 콜백 URL 설정
  ```

---

### 2.3 Worker (Go)

#### 2.3.1 암호화 모듈
- **파일**: `worker/internal/crypto/crypto.go`
- **목적**: OAuth 토큰 AES-256-GCM 암호화/복호화
- **주요 함수**:
  - `Encrypt(plaintext string) (string, error)`
  - `Decrypt(encrypted string) (string, error)`
- **구현 로직** (한글):
  ```
  {상세 설명}
  - AES-256-GCM 선택 이유 (AEAD, 무결성 검증)
  - nonce 생성 방식 (crypto/rand)
  - 암호문 포맷 (iv_hex:ciphertext_hex)
  - 에러 처리 (키 길이 검증, 복호화 실패)
  ```
- **테스트**:
  - TC-10001: Encrypt → Decrypt 원본 일치 ✅
  - TC-10005: 동일 평문 2회 암호화 → 서로 다른 암호문 ✅

#### 2.3.2 데이터베이스 연결
- **파일**: `worker/internal/db/connection.go`
- **목적**: pgxpool 커넥션 풀 생성
- **구현 로직** (한글):
  ```
  {상세 설명}
  - pgxpool vs database/sql 선택 이유
  - 커넥션 풀 설정 (최대 연결 수, 타임아웃)
  - service_role 키 사용 (RLS 바이패스)
  ```

---

## 3. 주요 아키텍처 결정

### 3.1 토큰 암호화 전략
- **결정**: AES-256-GCM 사용
- **이유**:
  - AEAD (Authenticated Encryption with Associated Data)
  - 무결성 검증 내장
  - Go 표준 라이브러리 지원
- **대안 고려**:
  - AES-CBC: 무결성 검증 없음 → 제외
  - RSA: 성능 이슈 → 제외

### 3.2 RLS 정책 설계
- **결정**: 모든 테이블에 `auth.uid() = user_id` 정책 적용
- **이유**:
  - 사용자 간 데이터 격리 보장
  - 애플리케이션 레벨 버그로 인한 데이터 유출 방지
- **트레이드오프**:
  - Worker는 service_role 키로 RLS 바이패스 필요

---

## 4. 테스트 결과

### 4.1 Unit Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-10001 | ✅ Pass | Encrypt/Decrypt 정상 동작 |
| TC-10002 | ✅ Pass | 잘못된 키로 복호화 시 에러 |
| ... | | |

### 4.2 Integration Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1005 | ✅ Pass | 가입 시 profiles 레코드 생성 확인 |
| TC-2002 | ✅ Pass | OAuth 콜백 → 토큰 암호화 저장 |
| ... | | |

### 4.3 E2E Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1001 | ✅ Pass | 이메일 가입 → 로그인 → 대시보드 진입 |
| TC-1011 | ✅ Pass | Google OAuth 가입 E2E |
| ... | | |

### 4.4 Security Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-10006 | ✅ Pass | User A ↔ User B 데이터 격리 확인 |
| TC-10011 | ✅ Pass | service_role 키로 전체 데이터 접근 |
| ... | | |

---

## 5. 남은 이슈 및 기술 부채

### 5.1 알려진 이슈
- [ ] {이슈 1 설명}
- [ ] {이슈 2 설명}

### 5.2 기술 부채
- [ ] {기술 부채 1}
- [ ] {기술 부채 2}

### 5.3 다음 스프린트 개선 사항
- {개선 사항 1}
- {개선 사항 2}

---

## 6. 스프린트 회고

### 6.1 잘된 점
- {잘된 점 1}
- {잘된 점 2}

### 6.2 개선이 필요한 점
- {개선점 1}
- {개선점 2}

### 6.3 배운 점
- {배운 점 1}
- {배운 점 2}

---

## 7. 다음 스프린트 준비

### 7.1 Sprint {N+1} 선행 작업
- [ ] {선행 작업 1}
- [ ] {선행 작업 2}

### 7.2 의존성 확인
- {의존성 1}
- {의존성 2}
```

### 문서 작성 규칙

1. **언어**: 구현 로직 및 설명은 **반드시 한글**로 작성
2. **상세도**: 다른 개발자가 문서만 보고 이해할 수 있을 정도로 상세하게
3. **코드 예시**: 핵심 로직은 코드 스니펫 포함 (주석은 한글)
4. **다이어그램**: 복잡한 플로우는 Mermaid 다이어그램 추가 권장
5. **테스트 결과**: 모든 테스트 케이스 실행 결과 포함 (Pass/Fail)
6. **타임스탬프**: 문서 생성일, 마지막 업데이트 명시

### Orchestrator의 문서 작성 책임

**스프린트 종료 시 Orchestrator(Main Assistant)가 반드시 수행**:

1. 팀원들이 구현한 모든 컴포넌트 취합
2. 각 컴포넌트별 구현 로직을 한글로 상세 설명
3. 아키텍처 결정 사항 및 이유 문서화
4. 테스트 결과 종합
5. 알려진 이슈 및 기술 부채 기록
6. `docs/implementation/sprint-{N}-implementation.md` 파일 생성
7. 사용자에게 문서 제출 및 리뷰 요청

### 사용자 리뷰 프로세스

**매 스프린트 종료 후**:
1. Orchestrator가 구현 문서 제출
2. 사용자가 문서 검토 및 코드 리뷰
3. 피드백 반영 필요 시 추가 작업
4. 승인 후 다음 스프린트 진행

**리뷰 체크리스트**:
- [ ] 모든 User Stories 완료 확인
- [ ] 테스트 케이스 Pass 확인
- [ ] 구현 로직이 명확하게 설명되어 있는가
- [ ] 아키텍처 결정이 합리적인가
- [ ] 보안 요구사항 충족 확인
- [ ] 기술 부채가 관리 가능한 수준인가

---

## File References

### Documentation

- `docs/technical-design-document.md` — Full system architecture, DB schema, Go/Next.js structure
- `docs/user-stories.md` — All user stories with acceptance criteria
- `docs/test-cases.md` — Complete test case catalog (157 TCs)
- `docs/sprint-backlog.md` — 6-week sprint task breakdown

### Key Directories

**Web (Next.js)**:
- `web/src/app/` — App Router pages
- `web/src/components/` — React components
- `web/src/lib/` — Supabase client, utilities

**Worker (Go)**:
- `worker/cmd/worker/` — Main entry point
- `worker/internal/agent/` — AI Agent executor
- `worker/internal/mcp/` — MCP tools (Gmail, Calendar, etc.)
- `worker/internal/scheduler/` — Cron dispatcher, Asynq queue
- `worker/internal/db/` — Database queries
- `worker/internal/crypto/` — AES-256-GCM encryption

**Supabase**:
- `supabase/migrations/` — SQL migration files

---

## Notes

- **POC mindset**: 속도와 반복 우선. 완벽한 아키텍처보다 실행력과 학습.
- **Security first**: OAuth 토큰 암호화, RLS 적용, HMAC 검증은 타협 불가.
- **Documentation**: User Stories와 Test Cases가 Single Source of Truth.
- **When in doubt**: Refer to `docs/` before making architectural decisions.
