# Floqi — Sprint Backlog

> `user-stories.md` + `test-cases.md` 기반 컴포넌트별 스프린트 백로그
> 6주 MVP 일정 / 컴포넌트: **Web (Next.js)**, **Worker (Go)**, **Supabase/Infra**
> 상태: ⬜ Todo | 🔵 In Progress | ✅ Done | 🚫 Blocked

---

## Sprint 1 (Week 1): 인증 + Google 연결 + 보안 기반

> **목표**: 사용자가 가입/로그인하고 Google 계정을 연결할 수 있는 기초 플로우 완성
> **관련 US**: US-101~105, US-201, US-1001~1003

### 📦 Supabase / Infra

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S1-INF-01 | Supabase 프로젝트 생성 및 환경변수 설정 | — | — | ⬜ | 1 |
| S1-INF-02 | 001_create_profiles.sql 마이그레이션 적용 (RLS + 트리거) | US-101 | TC-1005 | ⬜ | 2 |
| S1-INF-03 | 002_create_connected_services.sql 마이그레이션 적용 | US-201 | TC-2002 | ⬜ | 2 |
| S1-INF-04 | 005_create_user_preferences.sql 마이그레이션 적용 | US-104 | — | ⬜ | 1 |
| S1-INF-05 | Supabase Auth 설정 (이메일/비밀번호 + Google OAuth) | US-101, US-103 | TC-1001, TC-1011 | ⬜ | 2 |
| S1-INF-06 | RLS 정책 테스트 (profiles, connected_services) | US-1002 | TC-10006~10009 | ⬜ | 3 |
| S1-INF-07 | ENCRYPTION_KEY 생성 및 환경변수 등록 | US-1001 | TC-10004 | ⬜ | 1 |
| S1-INF-08 | Redis (Upstash) 인스턴스 생성 및 설정 | — | — | ⬜ | 1 |
| S1-INF-09 | docker-compose.yml 로컬 개발 환경 검증 | — | — | ⬜ | 1 |

**소계: 14 SP**

### 🌐 Web (Next.js)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S1-WEB-01 | 프로젝트 초기화 (npm install, 환경변수 설정) | — | — | ⬜ | 1 |
| S1-WEB-02 | Supabase 클라이언트 설정 (client.ts, server.ts) | — | — | ⬜ | 1 |
| S1-WEB-03 | 회원가입 페이지 UI (/signup) | US-101 | TC-1001~1006 | ⬜ | 3 |
| S1-WEB-04 | 회원가입 폼 유효성 검증 (이메일 형식, 비밀번호 8자) | US-101 | TC-1003, TC-1004, TC-1006 | ⬜ | 2 |
| S1-WEB-05 | 회원가입 API 연동 (Supabase Auth signUp) | US-101 | TC-1001, TC-1002, TC-1005 | ⬜ | 2 |
| S1-WEB-06 | 로그인 페이지 UI (/login) | US-102 | TC-1007~1010 | ⬜ | 2 |
| S1-WEB-07 | 로그인 API 연동 (signInWithPassword) | US-102 | TC-1007~1010 | ⬜ | 2 |
| S1-WEB-08 | Google OAuth 가입/로그인 버튼 + 콜백 처리 | US-103 | TC-1011~1014 | ⬜ | 3 |
| S1-WEB-09 | Auth 미들웨어 (인증 필요 라우트 보호) | US-105 | TC-1019 | ⬜ | 2 |
| S1-WEB-10 | 로그아웃 기능 | US-105 | TC-1018, TC-1019 | ⬜ | 1 |
| S1-WEB-11 | Connections 페이지 UI (/connections) | US-203 | TC-2008, TC-2009 | ⬜ | 3 |
| S1-WEB-12 | Google 서비스 연결 OAuth 플로우 (scopes: gmail, calendar) | US-201 | TC-2001, TC-2002, TC-2005 | ⬜ | 5 |
| S1-WEB-13 | OAuth 콜백 → 토큰 암호화 저장 Server Action | US-201 | TC-2002, TC-2003 | ⬜ | 3 |

**소계: 30 SP**

### ⚙️ Worker (Go)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S1-WKR-01 | Go 모듈 초기화 + 의존성 설치 (go mod tidy) | — | — | ⬜ | 1 |
| S1-WKR-02 | config.go 환경변수 로딩 구현 | — | — | ⬜ | 1 |
| S1-WKR-03 | db/connection.go pgxpool 커넥션 풀 구현 | — | — | ⬜ | 2 |
| S1-WKR-04 | crypto.go AES-256-GCM 암호화/복호화 구현 | US-1001 | TC-10001~10005 | ⬜ | 3 |
| S1-WKR-05 | crypto 유닛 테스트 작성 (5개 TC) | US-1001 | TC-10001~10005 | ⬜ | 2 |
| S1-WKR-06 | db/models.go 기본 모델 구조체 정의 | — | — | ⬜ | 1 |
| S1-WKR-07 | db/queries.go 기본 쿼리 (GetProfile, GetConnectedService) | US-1003 | TC-10011 | ⬜ | 2 |
| S1-WKR-08 | oauth/token.go 토큰 관리 (GetAccessToken + auto-refresh) | US-205 | TC-2014~2016 | ⬜ | 3 |
| S1-WKR-09 | oauth 유닛 테스트 작성 (3개 TC) | US-205 | TC-2014~2016 | ⬜ | 2 |

**소계: 17 SP**

### 🧪 Sprint 1 검증 체크리스트

- [ ] 이메일 가입 → 로그인 → 대시보드 진입 E2E 확인
- [ ] Google OAuth 가입 → 로그인 E2E 확인
- [ ] Google 서비스 연결 → connected_services 레코드 생성 확인
- [ ] RLS: User A ↔ User B 데이터 격리 확인
- [ ] AES-256-GCM 암호화/복호화 유닛 테스트 통과

---

## Sprint 2 (Week 2): 연결 관리 + 자동화 CRUD

> **목표**: 서비스 연결/해제 관리, 자동화 생성/목록/삭제/토글 기능 완성
> **관련 US**: US-203~204, US-301, US-303~306

### 📦 Supabase / Infra

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S2-INF-01 | 003_create_automations.sql 마이그레이션 적용 | US-303 | TC-3008 | ⬜ | 2 |
| S2-INF-02 | 004_create_execution_logs.sql 마이그레이션 적용 | US-503 | — | ⬜ | 2 |
| S2-INF-03 | RLS 정책 테스트 (automations, execution_logs) | US-1002 | TC-10007, TC-10008 | ⬜ | 2 |
| S2-INF-04 | service_role 정책 검증 (Worker → automations, logs 접근) | US-1003 | TC-10011, TC-10012 | ⬜ | 2 |

**소계: 8 SP**

### 🌐 Web (Next.js)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S2-WEB-01 | 연결 서비스 목록 UI (상태 표시: 연결됨/미연결) | US-203 | TC-2008~2010 | ⬜ | 2 |
| S2-WEB-02 | 서비스 연결 해제 기능 + 확인 모달 | US-204 | TC-2011~2013 | ⬜ | 3 |
| S2-WEB-03 | 연결 해제 시 관련 자동화 paused 전환 로직 | US-204 | TC-2013 | ⬜ | 2 |
| S2-WEB-04 | 자동화 목록 페이지 UI (/automations) | US-303 | TC-3006, TC-3007 | ⬜ | 3 |
| S2-WEB-05 | 빈 상태 UI + "Create Automation" CTA | US-303 | TC-3006 | ⬜ | 1 |
| S2-WEB-06 | 템플릿 선택 페이지 (5개 MVP 템플릿 카드) | US-301 | TC-3001 | ⬜ | 3 |
| S2-WEB-07 | 템플릿 기반 자동화 생성 Server Action | US-301 | TC-3002, TC-3003 | ⬜ | 3 |
| S2-WEB-08 | 필수 서비스 미연결 시 안내 UI | US-301 | TC-3003 | ⬜ | 2 |
| S2-WEB-09 | 자동화 활성화/일시정지 토글 | US-305 | TC-3012, TC-3013 | ⬜ | 2 |
| S2-WEB-10 | 자동화 삭제 + 확인 모달 | US-306 | TC-3015~3017 | ⬜ | 2 |

**소계: 23 SP**

### ⚙️ Worker (Go)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S2-WKR-01 | db/queries.go 확장 (GetActiveAutomations, GetAutomation) | US-303 | TC-3008, TC-3014 | ⬜ | 2 |
| S2-WKR-02 | db/queries.go 확장 (CreateExecutionLog, UpdateExecutionLog) | US-503 | TC-5011~5013 | ⬜ | 2 |
| S2-WKR-03 | db/queries.go 확장 (UpdateAutomationRunStats) | US-305 | TC-3013 | ⬜ | 1 |
| S2-WKR-04 | MCP Tool 인터페이스 + ToolRegistry 구현 | US-502 | — | ⬜ | 3 |
| S2-WKR-05 | RegisterDefaultTools() 기본 도구 등록 | US-502 | — | ⬜ | 1 |

**소계: 9 SP**

### 🧪 Sprint 2 검증 체크리스트

- [ ] 서비스 연결 해제 → 관련 자동화 일시정지 E2E 확인
- [ ] 5개 템플릿 표시 → Morning Briefing 선택 → 자동화 생성 E2E
- [ ] 자동화 목록 0개 → 빈 상태 UI 표시
- [ ] 자동화 active ↔ paused 토글 동작
- [ ] 자동화 삭제 + CASCADE execution_logs 확인

---

## Sprint 3 (Week 3): 실행 엔진 + Morning Briefing & Email Triage

> **목표**: AI Agent Tool Use 루프 완성, 첫 2개 템플릿 실행 가능
> **관련 US**: US-501~504, US-401~402

### 📦 Supabase / Infra

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S3-INF-01 | 006_create_usage_tracking.sql 마이그레이션 적용 | US-803 | — | ⬜ | 1 |

**소계: 1 SP**

### 🌐 Web (Next.js)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S3-WEB-01 | Redis enqueueTask 구현 (lib/redis.ts) | US-308 | TC-3020 | ⬜ | 2 |
| S3-WEB-02 | "Run Now" 버튼 UI + Server Action | US-308 | TC-3020, TC-3021 | ⬜ | 2 |
| S3-WEB-03 | 실행 상태 폴링/실시간 표시 (running → success/failed) | US-503 | TC-5012, TC-5013 | ⬜ | 3 |

**소계: 7 SP**

### ⚙️ Worker (Go)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S3-WKR-01 | agent/anthropic.go HTTP 클라이언트 + API 호출 | US-502 | TC-5005, TC-5010 | ⬜ | 5 |
| S3-WKR-02 | agent/prompt.go 시스템 프롬프트 빌더 | US-502 | TC-7003 | ⬜ | 2 |
| S3-WKR-03 | agent/executor.go Tool Use 루프 핵심 로직 | US-502 | TC-5005~5010 | ⬜ | 8 |
| S3-WKR-04 | agent/executor.go resolveLLMConfig (managed 모드 우선) | US-505 | TC-5018, TC-5021 | ⬜ | 2 |
| S3-WKR-05 | Tool Use 루프 유닛 테스트 (6개 TC) | US-502 | TC-5005~5010 | ⬜ | 5 |
| S3-WKR-06 | mcp/tools/gmail/gmail.go (ReadInbox, SendEmail, SearchEmail) | US-401 | TC-4001~4004 | ⬜ | 5 |
| S3-WKR-07 | mcp/tools/calendar/calendar.go (ListEvents, CreateEvent) | US-401 | TC-4001 | ⬜ | 3 |
| S3-WKR-08 | mcp/tools/weather/weather.go (GetWeather) | US-401 | TC-4003 | ⬜ | 2 |
| S3-WKR-09 | scheduler/queue.go Asynq 태스크 정의 (MaxRetry 3, Timeout 5m) | US-504 | TC-5015~5017 | ⬜ | 2 |
| S3-WKR-10 | scheduler/worker.go handleAutomationRun 핸들러 | US-501 | TC-5001 | ⬜ | 3 |
| S3-WKR-11 | 실행 로그 기록 통합 (시작 → 완료/실패) | US-503 | TC-5011~5014 | ⬜ | 3 |
| S3-WKR-12 | 재시도 로직 통합 테스트 (3회 실패 → 최종 실패) | US-504 | TC-5015~5017 | ⬜ | 3 |
| S3-WKR-13 | Morning Briefing 통합 테스트 (Calendar+Gmail+Weather→Email) | US-401 | TC-4001~4005 | ⬜ | 5 |
| S3-WKR-14 | Email Triage 통합 테스트 (미읽은 이메일 분류) | US-402 | TC-4006~4008 | ⬜ | 3 |

**소계: 51 SP**

### 🧪 Sprint 3 검증 체크리스트

- [ ] Morning Briefing 수동 실행 → 일정+이메일+날씨 요약 이메일 수신
- [ ] Email Triage 수동 실행 → 이메일 분류 결과 확인
- [ ] Tool Use 루프 10회 반복 제한 동작
- [ ] API 타임아웃 → Asynq 재시도 트리거
- [ ] 실행 로그에 tool_calls, tokens_used, duration 기록

---

## Sprint 4 (Week 4): Reading Digest + 실행 로그 UI

> **목표**: 3번째 핵심 템플릿 완성, 실행 로그 조회/상세 UI 완성
> **관련 US**: US-403, US-601~602

### 🌐 Web (Next.js)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S4-WEB-01 | 실행 로그 목록 페이지 UI (/logs) | US-601 | TC-6001~6003 | ⬜ | 3 |
| S4-WEB-02 | 로그 상태별 아이콘/색상 (성공:초록, 실패:빨강, 실행중:파랑) | US-601 | TC-6002 | ⬜ | 1 |
| S4-WEB-03 | 빈 상태 UI ("아직 실행 이력이 없습니다") | US-601 | TC-6003 | ⬜ | 1 |
| S4-WEB-04 | 실행 로그 상세 페이지 UI (/logs/[id]) | US-602 | TC-6004~6006 | ⬜ | 5 |
| S4-WEB-05 | tool_calls 단계별 아코디언 UI | US-602 | TC-6006 | ⬜ | 3 |
| S4-WEB-06 | 실패 로그 error_message 강조 표시 | US-602 | TC-6005 | ⬜ | 1 |

**소계: 14 SP**

### ⚙️ Worker (Go)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S4-WKR-01 | mcp/tools/news/news.go (FetchHeadlines) | US-403 | TC-4009 | ⬜ | 2 |
| S4-WKR-02 | mcp/tools/notion/notion.go (SearchPages, CreatePage) | US-403 | TC-4011 | ⬜ | 3 |
| S4-WKR-03 | Reading Digest 통합 테스트 (뉴스 수집→요약→Notion 저장) | US-403 | TC-4009~4011 | ⬜ | 3 |
| S4-WKR-04 | scheduler/cron.go CronDispatcher 구현 | US-501 | TC-5001~5004 | ⬜ | 5 |
| S4-WKR-05 | CronDispatcher 중복 enqueue 방지 테스트 | US-501 | TC-5004 | ⬜ | 2 |
| S4-WKR-06 | cmd/worker/main.go 통합 (DB + Registry + Executor + Worker + Cron) | — | — | ⬜ | 3 |

**소계: 18 SP**

### 🧪 Sprint 4 검증 체크리스트

- [ ] Reading Digest 실행 → 뉴스 요약 + Notion 페이지 생성 확인
- [ ] 실행 로그 목록 → 상세 → tool_calls 펼침 E2E 확인
- [ ] CronDispatcher 매분 체크 → due automation enqueue 동작
- [ ] 동일 자동화 중복 enqueue 방지 확인

---

## Sprint 5 (Week 5): 스케줄 설정 + 랜딩 페이지

> **목표**: 사용자 친화적 크론 설정 UI, 공개 랜딩 페이지 완성
> **관련 US**: US-304, US-901~902

### 🌐 Web (Next.js)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S5-WEB-01 | 스케줄 설정 UI (프리셋: 매일 오전 7시, 매주 월요일 등) | US-304 | TC-3009, TC-3010 | ⬜ | 3 |
| S5-WEB-02 | 프리셋 → 크론 표현식 변환 유틸 | US-304 | TC-3011 | ⬜ | 2 |
| S5-WEB-03 | 사용자 타임존 반영 크론 표현식 저장 | US-304 | TC-3011 | ⬜ | 2 |
| S5-WEB-04 | 랜딩 페이지 히어로 섹션 | US-901 | TC-9001 | ⬜ | 3 |
| S5-WEB-05 | 3단계 사용법 섹션 + 템플릿 소개 | US-901 | TC-9001 | ⬜ | 3 |
| S5-WEB-06 | CTA 버튼 ("Get started free" → /signup) | US-902 | TC-9003, TC-9004 | ⬜ | 1 |
| S5-WEB-07 | 모바일 반응형 레이아웃 | US-901 | TC-9002 | ⬜ | 3 |
| S5-WEB-08 | 로그인 상태 → 대시보드 리다이렉트 | US-902 | TC-9005 | ⬜ | 1 |
| S5-WEB-09 | 자동화 수정 페이지 (프롬프트 + 스케줄 편집) | US-307 | TC-3018, TC-3019 | ⬜ | 3 |
| S5-WEB-10 | 자연어 커스텀 자동화 생성 UI | US-302 | TC-3004, TC-3005 | ⬜ | 3 |
| S5-WEB-11 | 로그 필터링 (자동화별, 상태별, 날짜 범위) | US-603 | TC-6007~6009 | ⬜ | 3 |

**소계: 27 SP**

### 🧪 Sprint 5 검증 체크리스트

- [ ] "매일 오전 7시" 프리셋 → cron "0 7 * * *" 저장 확인
- [ ] Asia/Seoul 타임존 반영 확인
- [ ] 랜딩 페이지 모바일 768px 이하 레이아웃 정상
- [ ] CTA → /signup, "Log in" → /login 내비게이션 확인
- [ ] 자연어 자동화 생성 → 빈 프롬프트 유효성 검증

---

## Sprint 6 (Week 6): 프로필 설정 + 통합 테스트 + 버그 수정

> **목표**: 설정 페이지 완성, 전체 E2E 통합 테스트, 버그 수정, 배포 준비
> **관련 US**: US-701, US-505, US-1004~1006 + 전체 통합

### 📦 Supabase / Infra

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S6-INF-01 | Vercel 배포 설정 (환경변수, 도메인) | — | — | ⬜ | 2 |
| S6-INF-02 | Fly.io 배포 설정 (Dockerfile, 환경변수) | — | — | ⬜ | 2 |
| S6-INF-03 | Supabase production 환경 마이그레이션 | — | — | ⬜ | 2 |
| S6-INF-04 | Upstash Redis production 환경 설정 | — | — | ⬜ | 1 |

**소계: 7 SP**

### 🌐 Web (Next.js)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S6-WEB-01 | Settings 페이지 UI (/settings) | US-701 | TC-7001~7004 | ⬜ | 3 |
| S6-WEB-02 | 프로필 편집 (이름, 타임존, 언어) Server Action | US-701 | TC-7001~7004 | ⬜ | 2 |
| S6-WEB-03 | 대시보드 통계 카드 (활성 자동화, 실행 횟수, 토큰) | US-604 | TC-6010, TC-6011 | ⬜ | 3 |
| S6-WEB-04 | 대시보드 → 자동화/로그 요약 위젯 | US-604 | TC-6010 | ⬜ | 2 |
| S6-WEB-05 | 전체 E2E 시나리오 테스트 (가입→연결→생성→실행→로그확인) | — | TC-1001, TC-2001, TC-3002, TC-3020, TC-6004 | ⬜ | 5 |
| S6-WEB-06 | 접근성 + UI 일관성 점검 | — | — | ⬜ | 2 |
| S6-WEB-07 | 에러 핸들링 통합 (토스트 알림, 폴백 UI) | — | — | ⬜ | 3 |

**소계: 20 SP**

### ⚙️ Worker (Go)

| ID | Task | US | TC | 상태 | Story Points |
|----|------|----|----|------|-------------|
| S6-WKR-01 | BYOK 모드 전체 구현 (resolveLLMConfig 분기) | US-505 | TC-5018~5021 | ⬜ | 3 |
| S6-WKR-02 | BYOK 유닛 테스트 (4개 TC) | US-505 | TC-5018~5021 | ⬜ | 2 |
| S6-WKR-03 | 민감 정보 마스킹 유틸리티 | US-1006 | TC-10018~10020 | ⬜ | 3 |
| S6-WKR-04 | 마스킹 유닛 테스트 (3개 TC) | US-1006 | TC-10018~10020 | ⬜ | 2 |
| S6-WKR-05 | Webhook 수신 + HMAC 서명 검증 | US-1004 | TC-10013~10015 | ⬜ | 3 |
| S6-WKR-06 | 변경된 타임존/선호도가 프롬프트에 반영되는지 통합 테스트 | US-701 | TC-7003, TC-7010 | ⬜ | 2 |
| S6-WKR-07 | 전체 Worker 통합 테스트 (Cron→Queue→Execute→Log) | — | TC-5001~5014 | ⬜ | 5 |

**소계: 20 SP**

### 🧪 Sprint 6 검증 체크리스트

- [ ] 프로필 타임존 변경 → AI 프롬프트 반영 확인
- [ ] BYOK: 유효 키 → 사용자 키로 실행, 무효 키 → managed 폴백
- [ ] Webhook HMAC 검증: 유효/누락/위조 서명 3가지 확인
- [ ] 민감 정보 마스킹: 이메일, 토큰, API 키 마스킹 확인
- [ ] E2E 전체 플로우: 가입 → Google 연결 → 자동화 생성 → 실행 → 로그 확인
- [ ] Vercel + Fly.io 배포 정상 동작

---

## Post-MVP Backlog (P1/P2 — 향후 스프린트)

> Sprint 7 이후 진행 예정. 우선순위 및 비즈니스 요구에 따라 조정.

### P1 Tasks

| ID | Task | US | Component | Story Points |
|----|------|----|-----------|-------------|
| PM-01 | 온보딩 플로우 (타임존/언어 초기 설정) | US-104 | Web | 5 |
| PM-02 | Notion OAuth 연결 | US-202 | Web + Worker | 5 |
| PM-03 | 토큰 자동 갱신 실패 → 재연결 알림 UI | US-205 | Web | 3 |
| PM-04 | Weekly Review 템플릿 | US-404 | Worker | 5 |
| PM-05 | Smart Save 템플릿 (Webhook → Notion) | US-405 | Worker | 5 |
| PM-06 | Webhook 트리거 수신 API Route | US-506 | Web + Worker | 5 |
| PM-07 | BYOK API 키 등록/삭제 UI | US-702 | Web | 3 |
| PM-08 | 선호도 설정 UI (뉴스 카테고리 등) | US-703 | Web | 3 |
| PM-09 | 요금제 확인 UI | US-801 | Web | 2 |
| PM-10 | Stripe Checkout 연동 (Pro 업그레이드) | US-802 | Web + Infra | 8 |
| PM-11 | 사용량 대시보드 | US-803 | Web | 3 |
| PM-12 | Free 플랜 실행 제한 로직 | US-804 | Worker | 3 |
| PM-13 | 요금제 비교표 (랜딩 페이지) | US-903 | Web | 2 |
| PM-14 | Rate Limiting 미들웨어 | US-1005 | Web | 3 |
| PM-15 | 민감 정보 마스킹 고도화 | US-1006 | Worker | 2 |

**P1 소계: 57 SP**

### P2 Tasks

| ID | Task | US | Component | Story Points |
|----|------|----|-----------|-------------|
| PM-16 | 대시보드 고급 통계 (성공률 차트 등) | US-604 | Web | 5 |
| PM-17 | 출력 형식 설정 (이메일/Notion/both) | US-704 | Web + Worker | 3 |
| PM-18 | 계정 삭제 기능 | US-705 | Web + Infra | 5 |
| PM-19 | 결제 내역 (Stripe 고객 포털) | US-805 | Web | 3 |

**P2 소계: 16 SP**

---

## 전체 요약

| Sprint | 기간 | Web SP | Worker SP | Infra SP | 합계 SP |
|--------|------|--------|-----------|----------|---------|
| Sprint 1 | Week 1 | 30 | 17 | 14 | **61** |
| Sprint 2 | Week 2 | 23 | 9 | 8 | **40** |
| Sprint 3 | Week 3 | 7 | 51 | 1 | **59** |
| Sprint 4 | Week 4 | 14 | 18 | 0 | **32** |
| Sprint 5 | Week 5 | 27 | 0 | 0 | **27** |
| Sprint 6 | Week 6 | 20 | 20 | 7 | **47** |
| **MVP 합계** | **6주** | **121** | **115** | **30** | **266** |
| Post-MVP P1 | — | — | — | — | **57** |
| Post-MVP P2 | — | — | — | — | **16** |

### 컴포넌트별 부하 분포

```
Web (Next.js)  ████████████████████████ 121 SP (45%)
Worker (Go)    ███████████████████████  115 SP (43%)
Infra          ██████                    30 SP (12%)
```

### 테스트 커버리지 매핑

| Sprint | 관련 TC 수 | Unit | Integration | E2E | Security |
|--------|-----------|------|-------------|-----|----------|
| Sprint 1 | 31 | 8 | 4 | 14 | 5 |
| Sprint 2 | 26 | 1 | 5 | 16 | 4 |
| Sprint 3 | 32 | 11 | 19 | 2 | 0 |
| Sprint 4 | 15 | 1 | 5 | 6 | 3 |
| Sprint 5 | 17 | 1 | 0 | 16 | 0 |
| Sprint 6 | 36 | 10 | 8 | 15 | 3 |
| **합계** | **157** | **22** | **53** | **70** | **12** |
