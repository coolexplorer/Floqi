# Floqi — UI/UX Design Guide

> AI Personal Autopilot 서비스의 UI/UX 설계 가이드
> 기술설계서 + 유저스토리 기반 / 2026 SaaS 디자인 트렌드 반영
> 작성 목적: 디자인 키트 선정 및 실제 디자인 작업의 출발점

---

## Part 1: UI/UX 설계 원칙

### 1.1 Floqi가 지켜야 할 5가지 디자인 원칙

Floqi는 "AI가 백그라운드에서 일하고, 사용자는 결과만 확인한다"는 제품 컨셉을 가지고 있습니다. 이 컨셉에서 도출되는 핵심 디자인 원칙은 다음과 같습니다.

**① Calm Technology (조용한 기술)**
자동화는 백그라운드에서 돌아갑니다. UI는 "지금 뭘 해야 하지?"가 아니라 "잘 돌아가고 있구나"를 전달해야 합니다. 대시보드는 과도한 정보 없이 핵심 상태만 보여주고, 문제가 있을 때만 주의를 끌어야 합니다.

**② Progressive Disclosure (점진적 노출)**
처음 사용자에게는 템플릿 선택이라는 단순한 진입점을, 숙련 사용자에게는 커스텀 프롬프트와 크론 설정이라는 깊은 제어를 제공합니다. 한 화면에 모든 옵션을 보여주지 않습니다.

**③ Trust Through Transparency (투명성을 통한 신뢰)**
AI가 무엇을 했는지 실행 로그에서 도구 호출 단계별로 확인할 수 있어야 합니다. "AI가 알아서 했습니다"가 아니라 "Gmail에서 3통 읽고, 날씨 확인하고, 요약 이메일 보냈습니다"까지 보여줍니다.

**④ Accessible by Default (기본으로서의 접근성)**
WCAG 2.1 AA 준수, 키보드 내비게이션, 스크린 리더 호환, 색상 대비 4.5:1 이상. 모든 인터랙티브 요소에 포커스 링을 보장합니다.

**⑤ Mobile-Aware, Desktop-First**
핵심 사용 시나리오는 데스크톱이지만, 대시보드 확인과 수동 실행 정도는 모바일에서도 가능해야 합니다. 반응형 레이아웃은 필수입니다.

### 1.2 경쟁 제품 UI 벤치마크

Floqi의 포지셔닝은 Zapier/Make.com의 "자동화" 컨셉과 Notion AI의 "개인 어시스턴트" 컨셉의 교차점에 있습니다.

| 제품 | UI 특징 | Floqi가 배울 점 | Floqi가 차별화할 점 |
|------|---------|---------------|-------------------|
| **Zapier** | 단순, 직관적 trigger→action 플로우 | 단순한 진입 경험 | Floqi는 노드 편집 아님, 자연어 중심 |
| **Make.com** | 비주얼 워크플로우 캔버스 | 실행 결과 시각화 | Floqi는 캔버스 없이 카드 기반 |
| **n8n** | 기술 지향적, 노드 상세 편집 | 실행 로그 상세도 | Floqi는 비기술 사용자 대상 |
| **Notion AI** | 인라인 AI, 자연스러운 통합 | 자연어 인터페이스 | Floqi는 자동 실행(스케줄) 중심 |
| **Lindy.ai** | AI 에이전트 카드, 실행 타임라인 | 에이전트 상태 표현 | Floqi는 5개 MVP 템플릿 집중 |

---

## Part 2: 전체 페이지 맵 및 IA (Information Architecture)

### 2.1 사이트맵

```
floqi.app
├── / (Landing Page) ─── 비로그인 사용자
│   ├── Hero Section
│   ├── How It Works (3단계)
│   ├── Templates Preview
│   ├── Pricing Table
│   └── CTA → /signup
│
├── /signup ─── 회원가입
├── /login ─── 로그인
├── /onboarding ─── 첫 로그인 온보딩
│
├── /(dashboard) ─── 인증 필요 영역
│   ├── / (Dashboard Home) ─── 개요/통계
│   ├── /automations ─── 자동화 목록
│   │   ├── /automations/new ─── 자동화 생성 (템플릿 or 커스텀)
│   │   └── /automations/[id] ─── 자동화 상세/수정
│   ├── /logs ─── 실행 로그 목록
│   │   └── /logs/[id] ─── 실행 로그 상세
│   ├── /connections ─── 서비스 연결 관리
│   └── /settings ─── 설정
│       ├── Profile (이름, 타임존, 언어)
│       ├── API Keys (BYOK)
│       ├── Preferences (뉴스 카테고리 등)
│       ├── Billing (요금제, 사용량)
│       └── Account (계정 삭제)
```

### 2.2 사용자 플로우 (핵심 Journey)

```
[첫 방문]
Landing → Signup → Email 인증 → Login → Onboarding(타임존/언어)
→ Dashboard(빈 상태) → "Create Automation" CTA

[자동화 생성]
Automations(빈 상태) → New → 템플릿 선택 or 커스텀
→ (서비스 미연결 시) Connections → Google OAuth → 돌아오기
→ 스케줄 설정 → 생성 완료 → 자동화 목록

[결과 확인]
Dashboard → 통계 카드 → Logs → 로그 상세 → tool_calls 펼침

[수동 실행]
Automations → 자동화 카드 → "Run Now" → 실행 중 표시 → Logs 확인
```

---

## Part 3: 페이지별 UI 항목 상세

### 3.1 Landing Page (`/`)

**목적**: 서비스 가치 전달 + 가입 유도

| 섹션 | UI 요소 | 설명 |
|------|---------|------|
| **Navigation Bar** | 로고, "Log in" 링크, "Get Started" 버튼 | 고정 헤더, 스크롤 시 배경 blur |
| **Hero Section** | 대형 헤드라인, 서브 카피, CTA 버튼, 히어로 일러스트/스크린샷 | "AI가 당신의 일상을 자동으로 정리합니다" 느낌 |
| **How It Works** | 3단계 가로 카드 (연결 → 설정 → 자동실행) | 아이콘 + 짧은 설명, 단계 번호 |
| **Templates Preview** | 5개 템플릿 카드 (아이콘, 이름, 한줄 설명) | Morning Briefing, Email Triage 등 |
| **Pricing** | 3컬럼 비교표 (Free / Pro / BYOK) | 가격, 한도, 주요 기능 체크마크 |
| **Footer** | 카피라이트, 링크(이용약관, 개인정보처리방침) | 미니멀 |

**디자인 포인트**:
- Hero 일러스트는 "자는 동안 AI가 일하는" 느낌의 추상적 이미지
- CTA 버튼 색상은 primary color(브랜드 블루)로 시선 집중
- 모바일에서 Hero 이미지는 축소/숨김, CTA 상단 배치

### 3.2 Auth Pages (`/signup`, `/login`)

**목적**: 최소한의 마찰로 가입/로그인

| 요소 | 상세 |
|------|------|
| **레이아웃** | 2컬럼 (왼쪽: 브랜드 비주얼, 오른쪽: 폼) or 중앙 카드형 |
| **회원가입 폼** | 이메일 input, 비밀번호 input (최소 8자 표시), "Sign Up" 버튼 |
| **Google OAuth** | "Continue with Google" 버튼 (Google 브랜드 가이드라인 준수) |
| **폼 유효성** | 인라인 에러 메시지 (필드 하단, 빨간색), 실시간 유효성 체크 |
| **전환 링크** | 가입 ↔ 로그인 상호 링크 ("Already have an account? Log in") |
| **에러 상태** | 중복 이메일, 잘못된 비밀번호 등 토스트 or 인라인 |

**디자인 포인트**:
- 폼 필드 최소화 (이메일 + 비밀번호만, 이름은 온보딩에서)
- Google OAuth 버튼을 폼 상단에 배치 (간편 가입 우선)
- 비밀번호 강도 인디케이터 (약/중/강)

### 3.3 Onboarding (`/onboarding`)

**목적**: 초기 설정 완료, 첫 경험 가치 전달

| 단계 | UI 요소 | 설명 |
|------|---------|------|
| **Step 1** | 환영 메시지 + 이름 입력 | "Floqi에 오신 것을 환영합니다!" |
| **Step 2** | 타임존 드롭다운 (자동 감지 + 수동 선택) | 브라우저 타임존 기본값 |
| **Step 3** | 선호 언어 선택 (한국어/English) | 라디오 or 드롭다운 |
| **Step 4** | 첫 자동화 추천 + "지금 만들기" CTA | Morning Briefing 카드 하이라이트 |
| **Progress Bar** | 상단 스텝 인디케이터 (1/4, 2/4...) | 진행률 시각화 |

**디자인 포인트**:
- 풀스크린 모달 or 전용 페이지 (대시보드 위에 오버레이 아님)
- 스킵 가능하지만 권장 설정은 명시
- Step 4에서 Google 연결을 자연스럽게 유도

### 3.4 Dashboard Home (`/(dashboard)/`)

**목적**: 전체 상태 한눈에 파악, 빠른 액션 진입

| 요소 | 상세 |
|------|------|
| **Stats Cards (가로 3~4개)** | 활성 자동화 수 / 이번 주 실행 횟수 / 총 토큰 사용량 / 성공률 |
| **Recent Activity** | 최근 실행 로그 5개 (시간, 자동화명, 상태 뱃지) |
| **Quick Actions** | "Create Automation", "Run Now" 바로가기 |
| **Empty State** | 자동화 0개일 때: 일러스트 + "첫 자동화를 만들어보세요" CTA |
| **Notification Banner** | 서비스 연결 만료, 실행 실패 알림 (상단 배너 or 카드) |

**디자인 포인트**:
- Stats 카드는 숫자가 크게, 라벨이 작게 (정보 위계)
- 성공률은 녹색, 실패 알림은 빨간 도트/배너
- 빈 상태 디자인이 특히 중요 — 첫인상이므로 매력적으로

### 3.5 Automations List (`/automations`)

**목적**: 내 자동화 현황 관리

| 요소 | 상세 |
|------|------|
| **페이지 헤더** | "My Automations" 타이틀 + "+ New Automation" 버튼 |
| **자동화 카드** | 카드 or 리스트 아이템 형태 |
| **카드 내 정보** | 아이콘(템플릿별), 자동화 이름, 상태 뱃지(Active/Paused), 마지막 실행 시간, 다음 실행 시간 |
| **카드 액션** | 토글(활성/일시정지), 케밥 메뉴(수정, 수동 실행, 삭제) |
| **빈 상태** | 일러스트 + "자동화를 만들어보세요" + CTA 버튼 |
| **필터/정렬** | 상태별 필터 (All / Active / Paused), 정렬 (최신/이름) |

**카드 레이아웃 (각 자동화)**:
```
┌─────────────────────────────────────────────────┐
│  ☀️  Morning Briefing              [Active] 🟢  │
│  매일 오전 7시 · 마지막 실행: 오늘 07:00          │
│  다음 실행: 내일 07:00                            │
│                          [Run Now] [⋮ 더보기]     │
└─────────────────────────────────────────────────┘
```

### 3.6 Automation Create (`/automations/new`)

**목적**: 쉽게, 빠르게 자동화를 만드는 경험

| 단계 | UI 요소 | 설명 |
|------|---------|------|
| **Step 1: 방식 선택** | 2개 큰 카드: "템플릿으로 시작" / "직접 만들기" | |
| **Step 2a: 템플릿** | 5개 템플릿 그리드 카드 | 아이콘, 이름, 한줄 설명, 필요 서비스 뱃지(Google, Notion) |
| **Step 2b: 커스텀** | 자연어 입력 텍스트 에어리어 | "어떤 자동화를 원하시나요?" 플레이스홀더 |
| **Step 3: 서비스 연결 확인** | 필요 서비스 연결 상태 체크 | 미연결 시 "Google 연결하기" 인라인 버튼 |
| **Step 4: 스케줄 설정** | 프리셋 버튼 그룹 + 커스텀 시간 | "매일 오전 7시", "매주 월요일", "수동 실행만" |
| **Step 5: 확인 및 생성** | 요약 카드 + "Create Automation" 버튼 | 이름, 스케줄, 연결 서비스 요약 |

**디자인 포인트**:
- 마법사(Wizard) 패턴: 스텝 바이 스텝, 프로그레스 바
- 템플릿 카드에 필요 서비스 아이콘 표시 (Google: 🔵, Notion: ⬛)
- 미연결 서비스가 있으면 해당 스텝에서 연결 플로우로 분기 후 복귀

### 3.7 Automation Detail/Edit (`/automations/[id]`)

**목적**: 자동화 설정 확인 및 수정

| 섹션 | UI 요소 | 설명 |
|------|---------|------|
| **헤더** | 자동화 이름 + 상태 뱃지 + 액션 버튼들 | Run Now, Pause/Resume, Delete |
| **Overview 탭** | 프롬프트, 스케줄, 연결 서비스, 최근 실행 요약 | 읽기 모드 기본 |
| **Edit 모드** | 프롬프트 텍스트 에어리어, 스케줄 변경, agent_config | 인라인 편집 or 모달 |
| **Execution History** | 최근 10개 실행 로그 미니 리스트 | 클릭 시 /logs/[id]로 이동 |
| **Danger Zone** | 삭제 버튼 (빨간색, 확인 모달) | "이 자동화를 삭제하면 복구할 수 없습니다" |

### 3.8 Execution Logs (`/logs`)

**목적**: 실행 이력 추적, 디버깅

| 요소 | 상세 |
|------|------|
| **필터 바** | 자동화별 드롭다운, 상태별 칩(성공/실패/실행중), 날짜 범위 피커 |
| **로그 리스트** | 테이블 or 리스트 형태 |
| **리스트 컬럼** | 시간, 자동화명, 상태 뱃지, 소요 시간, 토큰 수 |
| **상태 표시** | ✅ Success(녹색) / ❌ Failed(빨간) / 🔵 Running(파란 스피너) |
| **빈 상태** | "아직 실행 이력이 없습니다" 일러스트 |
| **페이지네이션** | 무한 스크롤 or 페이지 번호 |

### 3.9 Execution Log Detail (`/logs/[id]`)

**목적**: 단일 실행의 전체 과정을 투명하게 보여주기

| 섹션 | UI 요소 | 설명 |
|------|---------|------|
| **Summary Card** | 자동화명, 실행 시간, 소요 시간, 상태, 토큰 수 | 카드 형태 상단 고정 |
| **Result Summary** | AI가 생성한 최종 결과 텍스트 | 마크다운 렌더링 |
| **Tool Calls Timeline** | 아코디언/스텝퍼 형태의 도구 호출 과정 | 핵심 — Floqi 투명성의 핵심 |
| **각 Tool Call** | 도구 이름, 입력 파라미터, 출력 결과, 소요 시간 | 펼침/접힘 가능 |
| **Error Section** | 실패 시 에러 메시지 강조 (빨간 배경) | 스택 트레이스는 숨김, 사용자 친화적 메시지 |

**Tool Calls Timeline 레이아웃**:
```
● gmail_list_recent_emails ─── 1.2s ✅
│  입력: query="is:unread", maxResults=10
│  출력: 5개 이메일 반환
│
● weather_current ─── 0.3s ✅
│  입력: city="Seoul"
│  출력: 맑음, 12°C
│
● gmail_send_email ─── 0.8s ✅
│  입력: to="user@example.com", subject="Morning Briefing"
│  출력: 전송 완료
│
◉ 완료 ─── 총 2.3s, 1,247 tokens
```

### 3.10 Connections (`/connections`)

**목적**: 외부 서비스 연결 관리

| 요소 | 상세 |
|------|------|
| **서비스 카드 그리드** | Google, Notion (MVP) + 향후 확장 자리 |
| **카드 내용** | 서비스 로고, 이름, 연결 상태, 연결 날짜 |
| **연결됨 상태** | 녹색 뱃지 "Connected" + "Disconnect" 버튼 |
| **미연결 상태** | 회색 뱃지 "Not Connected" + "Connect" 버튼 |
| **연결 해제 모달** | "이 서비스를 해제하면 관련 자동화가 일시정지됩니다" 경고 |
| **Scopes 표시** | 연결 시 허용된 권한 목록 (Gmail 읽기, Calendar 읽기 등) |

**카드 레이아웃**:
```
┌────────────────────────┐  ┌────────────────────────┐
│  [Google Logo]         │  │  [Notion Logo]         │
│  Google                │  │  Notion                │
│  Gmail + Calendar      │  │  Pages + Database      │
│                        │  │                        │
│  🟢 Connected          │  │  ⚪ Not Connected      │
│  연결일: 2026-03-01    │  │                        │
│  [Disconnect]          │  │  [Connect]             │
└────────────────────────┘  └────────────────────────┘
```

### 3.11 Settings (`/settings`)

**목적**: 개인화 + 계정 관리

| 탭/섹션 | UI 요소 | 설명 |
|---------|---------|------|
| **Profile** | 이름 input, 타임존 드롭다운, 언어 선택, 저장 버튼 | |
| **API Keys** | BYOK 모드 토글, API 키 입력 필드, 유효성 검증 버튼 | 키 입력 시 마스킹 (●●●●) |
| **Preferences** | 관심 뉴스 카테고리 멀티셀렉트, 이메일 중요도 기준 | |
| **Billing** | 현재 플랜 표시, 사용량 프로그레스 바, "Upgrade" 버튼 | |
| **Account** | 계정 삭제 (Danger Zone, 빨간 버튼, 확인 모달) | |

**사용량 표시**:
```
이번 달 사용량
실행 횟수: ████████░░ 42/50 (84%)
토큰 사용: ██████░░░░ 125K/200K (62%)
```

---

## Part 4: 공통 UI 컴포넌트 목록

### 4.1 Design Token 정의 필요 항목

| 카테고리 | 항목 | 설명 |
|----------|------|------|
| **Color** | Primary (brand blue), Accent (purple), Semantic (success/warning/error/info), Neutral (gray scale) | 각 색상 50~950 스케일 |
| **Typography** | Font family, Size scale (xs~4xl), Weight (regular/medium/semibold/bold), Line height | Inter 또는 Pretendard (한글 지원) |
| **Spacing** | 4px 배수 시스템 (4, 8, 12, 16, 20, 24, 32, 40, 48, 64) | Tailwind 기본 스케일과 호환 |
| **Radius** | sm(4px), md(8px), lg(12px), xl(16px), full(9999px) | 카드, 버튼, 인풋 등 |
| **Shadow** | sm, md, lg, xl | 카드, 모달, 드롭다운 |
| **Breakpoint** | sm(640), md(768), lg(1024), xl(1280) | Tailwind 기본 |

### 4.2 컴포넌트 라이브러리 항목

기본 원자(Atom) 레벨부터 복합(Organism) 레벨까지 필요한 컴포넌트 목록입니다.

**Atoms (기본 요소)**

| 컴포넌트 | Variants | 사용처 |
|----------|----------|--------|
| Button | primary, secondary, outline, ghost, danger / sm, md, lg | 전체 |
| Input | text, email, password, search / default, error, disabled | 폼 전체 |
| TextArea | default, error / auto-resize | 자동화 프롬프트 입력 |
| Select / Dropdown | single, multi, searchable | 타임존, 카테고리 |
| Toggle | on/off | 자동화 활성/비활성 |
| Badge | success(녹), error(빨), warning(노), info(파), neutral(회) | 상태 표시 |
| Avatar | 이미지, 이니셜, 사이즈 | 프로필 |
| Icon | Lucide React 아이콘 세트 | 전체 |
| Spinner | sm, md, lg | 로딩 상태 |
| Tooltip | top, bottom, left, right | 설명 필요 요소 |

**Molecules (조합 요소)**

| 컴포넌트 | 구성 | 사용처 |
|----------|------|--------|
| Form Field | Label + Input + Helper/Error text | 모든 폼 |
| Stat Card | 숫자 + 라벨 + 아이콘 + 변화량 | 대시보드 |
| Automation Card | 아이콘 + 이름 + 상태뱃지 + 메타 + 액션 | 자동화 목록 |
| Log Entry | 시간 + 이름 + 상태뱃지 + 소요시간 + 토큰 | 로그 목록 |
| Service Card | 로고 + 이름 + 연결상태 + 액션 버튼 | Connections |
| Step Indicator | 번호 + 라벨 + 완료/현재/대기 상태 | 온보딩, 자동화 생성 |
| Tool Call Step | 도구아이콘 + 이름 + 시간 + 펼침/접힘 | 로그 상세 |
| Empty State | 일러스트 + 메시지 + CTA 버튼 | 목록 빈 상태 |
| Notification Banner | 아이콘 + 메시지 + 액션 링크 + 닫기 | 알림 |

**Organisms (복합 요소)**

| 컴포넌트 | 구성 | 사용처 |
|----------|------|--------|
| Sidebar Navigation | 로고 + 네비 링크들 + 유저 메뉴 | 대시보드 레이아웃 |
| Top Navigation Bar | 로고 + 링크 + CTA | 랜딩 페이지 |
| Modal / Dialog | 오버레이 + 카드 + 헤더/바디/푸터 | 삭제확인, 연결해제 |
| Filter Bar | 드롭다운 + 칩 + 날짜 피커 | 로그 목록 |
| Schedule Picker | 프리셋 버튼 그룹 + 커스텀 시간 설정 | 자동화 생성/수정 |
| Pricing Table | 3컬럼 비교 카드 | 랜딩, 설정 |
| Tool Calls Timeline | 연결된 Step 리스트 + 아코디언 | 로그 상세 |
| Wizard / Stepper | Step Indicator + 단계별 컨텐츠 + 네비 버튼 | 자동화 생성, 온보딩 |
| Toast / Snackbar | 메시지 + 닫기 (자동 소멸) | 전역 알림 |

### 4.3 아이콘 체계

| 용도 | 아이콘 예시 (Lucide) | 설명 |
|------|---------------------|------|
| Morning Briefing | Sun, Sunrise | 아침 |
| Email Triage | Mail, InboxStack | 이메일 |
| Reading Digest | Newspaper, BookOpen | 뉴스 |
| Weekly Review | Calendar, BarChart | 주간 회고 |
| Smart Save | Bookmark, Save | 저장 |
| Google | — (브랜드 로고) | 외부 로고 사용 |
| Notion | — (브랜드 로고) | 외부 로고 사용 |
| 성공 | CheckCircle | 녹색 |
| 실패 | XCircle | 빨간색 |
| 실행중 | Loader (spin) | 파란색 |
| 설정 | Settings, Cog | |
| 삭제 | Trash2 | |
| 수정 | Pencil, Edit | |
| 실행 | Play | |
| 일시정지 | Pause | |

---

## Part 5: 디자인 시스템 권장 사항

### 5.1 컬러 팔레트 제안

기술설계서에 정의된 Tailwind 커스텀 컬러 기반 + 확장 제안입니다.

```
Primary (Brand Blue)
50:  #eff6ff    ← 배경 하이라이트
100: #dbeafe
200: #bfdbfe
300: #93c5fd
400: #60a5fa
500: #3b82f6    ← 기본 Primary
600: #2563eb    ← 버튼 hover
700: #1d4ed8
800: #1e40af
900: #1e3a8a

Accent (Purple)
50:  #faf5ff
...
500: #a855f7    ← 액센트 (프리미엄 느낌)
600: #9333ea

Semantic
Success: #22c55e (green-500)
Warning: #f59e0b (amber-500)
Error:   #ef4444 (red-500)
Info:    #3b82f6 (blue-500)

Neutral (Gray)
50:  #f9fafb    ← 페이지 배경
100: #f3f4f6    ← 카드 배경 (alt)
200: #e5e7eb    ← 보더
300: #d1d5db
400: #9ca3af    ← 비활성 텍스트
500: #6b7280    ← 보조 텍스트
600: #4b5563
700: #374151    ← 본문 텍스트
800: #1f2937    ← 헤딩
900: #111827    ← 강조 헤딩
```

### 5.2 타이포그래피 권장

| 용도 | 한글 폰트 | 영문 폰트 | 사유 |
|------|----------|----------|------|
| **1순위** | Pretendard | Inter | 가변 폰트, SaaS 최적화, 한/영 조화 |
| **2순위** | Noto Sans KR | Inter | Google Fonts 무료, 넓은 weight 지원 |
| **3순위** | Spoqa Han Sans Neo | Inter | 한글 가독성 우수 |

**타입 스케일**:

| Token | Size | Weight | Line Height | 용도 |
|-------|------|--------|-------------|------|
| display-lg | 48px | Bold | 1.1 | Landing Hero |
| display-sm | 36px | Bold | 1.2 | Landing 섹션 타이틀 |
| heading-lg | 24px | SemiBold | 1.3 | 페이지 타이틀 |
| heading-md | 20px | SemiBold | 1.4 | 섹션 타이틀 |
| heading-sm | 16px | SemiBold | 1.4 | 카드 타이틀 |
| body-lg | 16px | Regular | 1.6 | 본문 텍스트 |
| body-md | 14px | Regular | 1.5 | 기본 UI 텍스트 |
| body-sm | 12px | Regular | 1.5 | 보조 텍스트, 라벨 |
| caption | 11px | Medium | 1.4 | 타임스탬프, 메타 |

### 5.3 Spacing & Layout 권장

| 요소 | 간격 |
|------|------|
| 사이드바 너비 | 240px (접힘: 64px) |
| 콘텐츠 최대 너비 | 1200px |
| 카드 내부 패딩 | 16~24px |
| 카드 간 갭 | 16~24px |
| 섹션 간 간격 | 32~48px |
| 폼 필드 간 간격 | 16~20px |
| 버튼 내부 패딩 | y: 8~12px, x: 16~24px |

---

## Part 6: 디자인 키트 추천

### 6.1 Figma UI Kit 추천 (SaaS Dashboard 특화)

리서치 결과 Floqi에 적합한 디자인 키트를 우선순위로 정리했습니다.

| 순위 | 이름 | 특징 | 가격대 | 추천 이유 |
|------|------|------|--------|----------|
| **1** | **Untitled UI** | 10,000+ 컴포넌트, 변수 기반, SaaS 최적화 | $59~149 | 가장 체계적인 디자인 시스템, Tailwind 호환, 대시보드 패턴 풍부 |
| **2** | **Disy** | SaaS 전문 디자인 시스템, 모던한 느낌 | $79~149 | 깔끔한 대시보드 컴포넌트, Auto Layout 5.0 |
| **3** | **SaaS Design System (Figma Community)** | 500+ 컴포넌트, 무료 | 무료 | 비용 부담 없이 시작, 기본 컴포넌트 충분 |
| **4** | **Glow UI** | 5900+ 컴포넌트, 위젯, 대시보드 | $89~199 | 컴포넌트 수 최다, 복합 패턴(차트, 테이블) |
| **5** | **Beyond UI** | 7500+ 컴포넌트, 변수/토큰 650+ | $129~249 | 대규모 프로젝트, 디자인-개발 핸드오프 최적화 |

### 6.2 키트 선택 기준

Floqi의 특성을 고려한 키트 선택 체크리스트입니다.

- [ ] **Tailwind CSS 호환**: 프론트엔드가 Tailwind 기반이므로, 토큰/스페이싱이 Tailwind과 1:1 매핑되는 키트 우선
- [ ] **대시보드 패턴**: Stats 카드, 테이블, 필터 바, 타임라인 컴포넌트 포함 여부
- [ ] **마법사(Wizard) 패턴**: 자동화 생성 스텝퍼에 사용할 멀티스텝 폼 패턴
- [ ] **Empty State 패턴**: 빈 상태 일러스트 + CTA 조합
- [ ] **Auto Layout 5.0**: 반응형 디자인 작업의 효율성
- [ ] **Variables 지원**: 라이트/다크 모드, 컬러 토큰 관리
- [ ] **한글 호환**: 한국어 텍스트가 레이아웃을 깨뜨리지 않는지

### 6.3 보완 리소스

키트 외에 추가로 필요한 디자인 리소스입니다.

| 리소스 | 용도 | 추천 |
|--------|------|------|
| **일러스트** | Empty State, 온보딩, 에러 | unDraw, Storyset (무료), Craftwork (유료) |
| **아이콘** | UI 전체 | Lucide (코드와 동일 세트 사용) |
| **브랜드 로고** | Google, Notion 연결 표시 | 각 브랜드 공식 가이드라인 준수 |
| **목업** | 랜딩 페이지 브라우저/디바이스 목업 | Mockuuups Studio, Shots.so |

---

## Part 7: 디자인 작업 계획

### 7.1 디자인 페이즈 (4단계)

**Phase 1: Foundation (2~3일)**
- 디자인 키트 선정 및 세팅
- Color token, Typography scale, Spacing 정의
- Figma 프로젝트 구조 생성 (Pages: Tokens / Components / Pages / Flows)
- 컴포넌트 라이브러리 커스터마이즈 (키트 기반 → Floqi 브랜드 적용)

**Phase 2: Core Pages (5~7일)**
- Landing Page (Desktop + Mobile)
- Auth Pages (Signup, Login)
- Dashboard Home (데이터 있음 + 빈 상태)
- Automations List (데이터 있음 + 빈 상태)
- Automation Create (Wizard 5단계)
- Connections (연결됨 + 미연결 상태)

**Phase 3: Detail Pages (3~5일)**
- Automation Detail / Edit
- Execution Log List + Filter
- Execution Log Detail (Tool Calls Timeline)
- Settings (5개 탭)
- Onboarding (4단계)

**Phase 4: Polish & Handoff (2~3일)**
- 반응형 확인 (Desktop 1280px, Tablet 768px, Mobile 375px)
- 인터랙션 상태 정리 (hover, active, focus, disabled, loading, error)
- 프로토타이핑 (핵심 플로우 3개 연결)
- 개발 핸드오프 문서 (Figma Dev Mode 또는 Zeplin)

### 7.2 디자인 작업 우선순위

Sprint Backlog와 맞물려, 디자인은 개발보다 1스프린트 앞서 진행하는 것이 이상적입니다.

| 디자인 주차 | 대상 | 개발 스프린트 |
|------------|------|-------------|
| Week 0 | Phase 1 (Foundation) + Auth Pages | → Sprint 1 개발 |
| Week 1 | Dashboard + Automations + Connections | → Sprint 2 개발 |
| Week 2 | Automation Create Wizard + Log Pages | → Sprint 3~4 개발 |
| Week 3 | Landing Page + Settings + Onboarding | → Sprint 5~6 개발 |
| Week 4 | Polish + 반응형 + 프로토타이핑 | → QA 병행 |

### 7.3 디자인 시 주의사항 (시니어 UX 관점)

**① 상태(State)를 빠짐없이 디자인하세요**
각 페이지마다 최소 다음 상태를 디자인해야 합니다: Default, Loading, Empty, Error, Success. 특히 Empty State는 첫인상이므로 가장 세심하게 디자인하세요.

**② 실제 데이터로 디자인하세요**
"Lorem ipsum" 대신 실제 이메일 제목, 실제 날씨 데이터, 실제 자동화 이름을 넣으세요. 한글 텍스트는 영문보다 공간을 많이 차지하므로, 한글 기준으로 레이아웃 여유를 확보해야 합니다.

**③ 에러 상태를 먼저 디자인하세요**
OAuth 연결 실패, API 키 유효성 검증 실패, 실행 실패 등 에러 시나리오를 Happy Path보다 먼저 고민하세요. 에러 메시지는 "무엇이 잘못됐는지 + 어떻게 해결할 수 있는지"를 반드시 포함해야 합니다.

**④ Tool Calls Timeline이 차별점입니다**
로그 상세의 도구 호출 타임라인은 Floqi가 경쟁 제품과 차별화되는 핵심 UI입니다. AI가 무엇을 했는지 단계별로 보여주는 이 UI에 가장 많은 디자인 시간을 투자하세요.

**⑤ 모바일은 "확인 전용"으로 접근하세요**
모바일에서 자동화를 생성하거나 프롬프트를 편집하는 경험은 좋지 않습니다. 모바일에서는 대시보드 확인, 로그 확인, 수동 실행("Run Now") 정도만 쾌적하면 충분합니다.

**⑥ 다크 모드는 MVP 이후로 미루세요**
다크 모드를 지원하려면 모든 컴포넌트의 색상 토큰을 2벌 관리해야 합니다. MVP에서는 라이트 모드만 집중하되, Variables 구조는 다크 모드 확장을 고려해서 세팅하세요.

---

## Part 8: 핵심 UI 인터랙션 패턴

### 8.1 마이크로 인터랙션

| 인터랙션 | 적용처 | 구현 |
|----------|--------|------|
| **Toggle Animation** | 자동화 활성/비활성 | 0.2s ease, 색상+위치 전환 |
| **Card Hover** | 자동화 카드, 템플릿 카드 | translateY(-2px) + shadow 증가 |
| **Loading Skeleton** | 데이터 로딩 중 | 회색 Placeholder shimmer |
| **Toast Slide-in** | 성공/에러 알림 | 우상단에서 슬라이드 → 3초 후 페이드 |
| **Accordion Expand** | Tool Calls 펼침 | 0.3s ease, height auto transition |
| **Progress Step** | 온보딩, 자동화 생성 | 현재 스텝 = Primary 색, 완료 = 체크 아이콘 |
| **Status Pulse** | 실행중(Running) 상태 | 파란 도트 pulse animation |

### 8.2 피드백 패턴

| 사용자 행동 | 즉각 피드백 | 완료 피드백 |
|------------|-----------|-----------|
| 버튼 클릭 | 버튼 비활성 + 스피너 | 토스트 성공 메시지 |
| 자동화 생성 | 로딩 인디케이터 | 자동화 목록으로 리다이렉트 + 토스트 |
| Run Now | 버튼 → "Running..." 변경 | 로그 상세로 이동 가능 토스트 |
| 삭제 확인 | 모달 닫힘 + 스피너 | 목록에서 아이템 fade-out + 토스트 |
| OAuth 연결 | 새 창 열림 | 연결 성공 뱃지 변경 + 토스트 |

---

## 부록: 페이지 × 컴포넌트 매트릭스

각 페이지에서 사용되는 컴포넌트를 한눈에 보여주는 매트릭스입니다.

| 컴포넌트 | Landing | Auth | Onboard | Dash | Auto List | Auto Create | Auto Detail | Logs | Log Detail | Connect | Settings |
|----------|---------|------|---------|------|-----------|-------------|-------------|------|------------|---------|----------|
| Button | ● | ● | ● | ● | ● | ● | ● | | | ● | ● |
| Input | | ● | ● | | | ● | ● | | | | ● |
| TextArea | | | | | | ● | ● | | | | |
| Select | | | ● | | ● | ● | ● | ● | | | ● |
| Toggle | | | | | ● | | ● | | | | ● |
| Badge | | | | ● | ● | | ● | ● | ● | ● | ● |
| Stat Card | | | | ● | | | | | | | ● |
| Auto Card | | | | ● | ● | | | | | | |
| Log Entry | | | | ● | | | ● | ● | | | |
| Service Card | | | | | | ● | | | | ● | |
| Step Indicator | | | ● | | | ● | | | | | |
| Tool Call Step | | | | | | | | | ● | | |
| Empty State | | | | ● | ● | | | ● | | | |
| Modal | | | | | ● | | ● | | | ● | ● |
| Filter Bar | | | | | | | | ● | | | |
| Schedule Picker | | | | | | ● | ● | | | | |
| Sidebar Nav | | | | ● | ● | ● | ● | ● | ● | ● | ● |
| Top Nav | ● | ● | | | | | | | | | |
| Pricing Table | ● | | | | | | | | | | ● |
| Toast | | ● | | ● | ● | ● | ● | | | ● | ● |
| Timeline | | | | | | | | | ● | | |
| Wizard | | | ● | | | ● | | | | | |
