# Floqi — UI Design System 코드 구현 계획서

> Claude Code에서 실행할 UI 컴포넌트 라이브러리 + 페이지 구현 가이드
> 기반: `ui-design-guide.md` + Figma Community 키트 2종 패턴 조합
> - **시스템 기반**: AI SaaS Dashboard UI Kit (디자인 토큰, Atom 컴포넌트)
> - **도메인 패턴**: Automation Workflow Dashboard UI Kit (자동화 카드, 상태 표시, 실행 히스토리)

---

## 1. 현재 상태 (As-Is)

| 항목 | 상태 |
|------|------|
| 프레임워크 | Next.js 16 + React 19 + TypeScript |
| 스타일링 | Tailwind CSS v4 (`@import "tailwindcss"` 방식) |
| 인증 | Supabase Auth (이메일/비밀번호 + Google OAuth) 구현 완료 |
| 미들웨어 | 인증 필요 라우트 보호 완료 |
| 테스트 | Vitest + React Testing Library 설정 완료 |
| 컴포넌트 | LogoutButton 1개만 존재, 나머지는 인라인 Tailwind |
| 컬러 토큰 | teal(primary), indigo(secondary), amber(accent) 정의됨 |
| 폰트 | 시스템 폰트(Arial) — 커스텀 폰트 없음 |
| UI 라이브러리 | 없음 (shadcn/ui 등 미설치) |
| 페이지 | Landing(플레이스홀더), Login, Signup, Dashboard(플레이스홀더), Connections(플레이스홀더) |

## 2. 목표 상태 (To-Be)

| 항목 | 목표 |
|------|------|
| 디자인 토큰 | Color(semantic 포함), Typography(Inter+Pretendard), Spacing(4px base), Radius, Shadow 전체 체계 |
| 컴포넌트 | 40여개 (Atom 12 + Molecule 10 + Organism 8 + 기타) |
| 페이지 | 11개 전체 구현 (Landing, Auth×2, Onboarding, Dashboard, Automations×3, Logs×2, Connections, Settings) |
| 아이콘 | Lucide React 통합 |
| 반응형 | Desktop-first, 768px/375px 브레이크포인트 |
| 다크 모드 | CSS 변수 구조만 (실제 구현 Post-MVP) |

---

## 3. 기술 결정사항

### 3.1 핵심 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| UI 라이브러리 | **미사용** (Tailwind 직접 구현) | 의존성 최소화, Floqi 브랜딩 커스텀 자유도, 번들 사이즈 절약 |
| 아이콘 | **Lucide React** | 경량, 트리쉐이킹, ui-design-guide.md 아이콘 체계와 일치 |
| 폰트 | **Inter(영문) + Pretendard(한글)** | SaaS 최적화, 한/영 조화, Google Fonts CDN |
| 상태 관리 | **React hooks + Context API** | Toast/Modal 글로벌 상태만 필요, 별도 라이브러리 불필요 |
| CSS 방식 | **Tailwind v4 유틸리티 + CSS 변수** | 기존 프로젝트와 일관성, v4의 CSS-first 접근 활용 |
| 반응형 | **Desktop-first** | 핵심 사용 시나리오가 데스크톱, 모바일은 확인 전용 |

### 3.2 컬러 팔레트 (Tailwind config 확장)

```
Primary (Teal) — 기존 유지
  50: #F0FDFA → 900: #134E4A
  DEFAULT: #0D9488 (teal-600)

Secondary (Indigo) — 기존 유지
  50: #EEF2FF → 900: #312E81
  DEFAULT: #4F46E5 (indigo-600)

Accent (Amber) — 기존 유지
  50: #FFFBEB → 900: #78350F
  DEFAULT: #D97706 (amber-600)

Semantic (신규 추가)
  success: #22c55e (green-500)
  warning: #f59e0b (amber-500)
  error:   #ef4444 (red-500)
  info:    #3b82f6 (blue-500)

Neutral (명시적 정의)
  50: #f9fafb (페이지 배경)
  100: #f3f4f6 (카드 배경 alt)
  200: #e5e7eb (보더)
  300: #d1d5db
  400: #9ca3af (비활성 텍스트)
  500: #6b7280 (보조 텍스트)
  600: #4b5563
  700: #374151 (본문 텍스트)
  800: #1f2937 (헤딩)
  900: #111827 (강조 헤딩)
```

### 3.3 타이포그래피 스케일

```
display-lg: 48px / Bold / 1.1    → Landing Hero
display-sm: 36px / Bold / 1.2    → Landing 섹션 타이틀
heading-lg: 24px / SemiBold / 1.3 → 페이지 타이틀
heading-md: 20px / SemiBold / 1.4 → 섹션 타이틀
heading-sm: 16px / SemiBold / 1.4 → 카드 타이틀
body-lg:    16px / Regular / 1.6  → 본문 텍스트
body-md:    14px / Regular / 1.5  → 기본 UI 텍스트
body-sm:    12px / Regular / 1.5  → 보조 텍스트
caption:    11px / Medium / 1.4   → 타임스탬프, 메타
```

### 3.4 Spacing & Layout

```
Base: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

사이드바 너비: 240px (접힘: 64px)
콘텐츠 최대 너비: 1200px
카드 내부 패딩: 16~24px
카드 간 갭: 16~24px
섹션 간 간격: 32~48px

Radius: sm(4px), md(8px), lg(12px), xl(16px), full(9999px)
Shadow: sm, md, lg, xl (Tailwind 기본 활용)
```

---

## 4. 컴포넌트 폴더 구조

```
src/components/
├── ui/              # Atoms (기본 요소)
│   ├── Button.tsx        # primary/secondary/outline/ghost/danger × sm/md/lg
│   ├── Input.tsx         # text/email/password/search + error/disabled
│   ├── TextArea.tsx      # auto-resize + error
│   ├── Select.tsx        # single/searchable + disabled
│   ├── Toggle.tsx        # on/off × sm/md
│   ├── Badge.tsx         # success/error/warning/info/neutral × sm/md
│   ├── Avatar.tsx        # image/initials × sm/md/lg
│   ├── Spinner.tsx       # sm/md/lg
│   ├── Tooltip.tsx       # top/bottom/left/right
│   ├── Card.tsx          # elevated/outlined/flat + header/body/footer
│   ├── Modal.tsx         # sm/md/lg + overlay + ESC닫기
│   ├── EmptyState.tsx    # icon + message + CTA
│   ├── StepIndicator.tsx # 위자드 진행률 (completed/current/pending)
│   └── NotificationBanner.tsx  # info/warning/error/success + dismissible
│
├── forms/           # Form 관련
│   ├── FormField.tsx          # Label + Input + Helper/Error
│   ├── FormFieldPassword.tsx  # show/hide + 강도 인디케이터
│   ├── Wizard.tsx             # 멀티스텝 폼 컨테이너
│   └── WizardStep.tsx         # 개별 스텝 래퍼
│
├── cards/           # 도메인 카드 (3위 키트 패턴 참고)
│   ├── StatCard.tsx           # 숫자 + 라벨 + 아이콘 + 트렌드
│   ├── AutomationCard.tsx     # 아이콘 + 이름 + 상태뱃지 + 메타 + 액션
│   ├── ServiceCard.tsx        # 로고 + 이름 + 연결상태 + 버튼
│   └── LogEntry.tsx           # 시간 + 이름 + 상태 + 소요시간 + 토큰
│
├── filters/
│   └── FilterBar.tsx          # 상태칩 + 날짜피커 + 검색
│
├── pickers/
│   └── SchedulePicker.tsx     # 프리셋(매일/매주/수동) + 커스텀 시간
│
├── tables/
│   └── PricingTable.tsx       # 3컬럼(Free/Pro/BYOK) 비교표
│
├── timeline/        # Floqi 핵심 차별점 (직접 디자인)
│   ├── ToolCallStep.tsx       # 도구명 + 시간 + 입출력 아코디언
│   └── ToolCallsTimeline.tsx  # 수직 타임라인 + 완료 요약
│
├── toast/           # 글로벌 알림
│   ├── Toast.tsx              # 메시지 + 아이콘 + 닫기 (자동 소멸)
│   └── ToastProvider.tsx      # Context Provider + 스택 관리
│
├── layout/          # 레이아웃 Organism
│   ├── Sidebar.tsx            # 로고 + 네비 + 유저메뉴 + 접힘
│   └── TopNavBar.tsx          # 랜딩용 상단 네비 (스크롤 시 고정)
│
└── auth/            # 인증 (기존)
    └── LogoutButton.tsx       # 기존 컴포넌트 유지
```

---

## 5. 구현 Phase 상세

### Phase 1: 디자인 토큰 & Atom 컴포넌트

#### 수정 파일

**`web/package.json`** — 의존성 추가
```
lucide-react: latest
```

**`web/tailwind.config.ts`** — 디자인 토큰 확장
- semantic 컬러 추가 (success, warning, error, info)
- neutral 그레이 명시적 정의
- fontSize 확장 (display-lg ~ caption 스케일)
- borderRadius 토큰 (sm/md/lg/xl)
- boxShadow 확장

**`web/src/app/globals.css`** — CSS 변수 + 폰트
- Google Fonts CDN에서 Inter + Pretendard 임포트
- CSS custom properties로 전체 토큰 정의
- body 폰트를 Inter/Pretendard로 변경
- 기본 스크롤바, 셀렉션 등 글로벌 스타일

**`web/src/app/layout.tsx`** — 폰트 적용
- next/font에서 Inter 로드
- Pretendard CDN 링크 추가
- ToastProvider로 children 래핑

#### 신규 파일 (12개 Atom)

각 컴포넌트 구현 시 공통 패턴:
- TypeScript interface로 Props 정의
- forwardRef 사용 (DOM 접근 필요 시)
- className 병합을 위한 유틸 함수 (cn helper)
- 모든 상태(default, hover, active, focus, disabled, loading, error) 스타일링
- aria 속성으로 접근성 보장

**`src/lib/utils.ts`** — 유틸리티 (신규)
```typescript
// cn(): Tailwind 클래스 병합 유틸리티
// clsx + tailwind-merge 대용 (경량 구현)
```

**컴포넌트별 상세 스펙**:

| 컴포넌트 | Props | 상태 | 비고 |
|----------|-------|------|------|
| Button | variant, size, loading, disabled, icon, iconPosition, onClick, children | hover, active, focus, disabled, loading(spinner) | `<button>` 또는 `<a>` |
| Input | type, placeholder, error, errorMessage, disabled, icon, onChange, value | focus, error, disabled | `<input>` |
| TextArea | placeholder, error, rows, autoResize, maxLength, onChange | focus, error | `<textarea>` |
| Select | options[], value, onChange, placeholder, searchable, disabled | open, focus, disabled | 커스텀 드롭다운 |
| Toggle | checked, onChange, size, disabled, label | on, off, disabled | `<button role="switch">` |
| Badge | variant(success/error/warning/info/neutral), size, icon, children | — | `<span>` |
| Avatar | src?, name, size, status? | 이미지 로드 실패 → 이니셜 폴백 | `<div>` + `<img>` |
| Spinner | size, color? | — | SVG 애니메이션 |
| Tooltip | content, position, children | hover 시 표시 | Portal 사용 |
| Card | variant(elevated/outlined/flat), padding?, children | — | `<div>` |
| Modal | isOpen, onClose, size, title, children, footer? | open/close 애니메이션 | Portal + backdrop |
| EmptyState | icon, title, description, actionLabel?, onAction? | — | 일러스트 + 텍스트 + CTA |

---

### Phase 2: Molecule 컴포넌트 + Auth 리디자인

#### 신규 파일 (10개 Molecule)

| 컴포넌트 | 구성 | Props |
|----------|------|-------|
| FormField | Label + Input + Error | label, name, type, error, required, helper |
| FormFieldPassword | FormField + show/hide + 강도바 | + showStrength |
| StatCard | Card + 숫자 + 라벨 + 아이콘 + 트렌드 | title, value, icon, trend?, trendValue? |
| AutomationCard | Card + 아이콘 + 이름 + Badge + 메타 + 액션 | automation: {id, name, templateIcon, status, lastRun, nextRun, schedule} |
| ServiceCard | Card + 로고 + 이름 + 상태 + 버튼 | service: {name, logo, connected, connectedAt, scopes} |
| LogEntry | 가로 아이템: 시간 + 이름 + Badge + 시간 + 토큰 | log: {id, time, automationName, status, duration, tokens} |
| StepIndicator | 가로 스텝 바 | steps: {label, status}[], currentStep |
| NotificationBanner | 아이콘 + 메시지 + 액션 + 닫기 | variant, message, action?, onDismiss |
| Toast | 아이콘 + 메시지 + 닫기 | variant(success/error/warning/info), message, duration? |
| ToastProvider | Context + 스택 렌더링 | children (앱 전체 래핑) |

#### 수정 파일 (Auth 리디자인)

**`app/(auth)/login/page.tsx`** 리디자인:
- 2컬럼 레이아웃 (왼쪽: 브랜드 비주얼, 오른쪽: 폼)
- FormField 컴포넌트로 이메일/비밀번호 필드 교체
- Button 컴포넌트로 제출 버튼 교체
- "Continue with Google" 브랜드 버튼
- Toast로 에러/성공 알림 교체
- 기존 Supabase Auth 로직 유지

**`app/(auth)/signup/page.tsx`** 리디자인:
- FormFieldPassword로 비밀번호 강도 표시
- 동일한 2컬럼 레이아웃
- 기존 유효성 검증 로직 유지 + UI 개선

---

### Phase 3: Organism 컴포넌트 + 핵심 페이지

#### 신규 파일 (8개 Organism)

| 컴포넌트 | 상세 |
|----------|------|
| Sidebar | 240px 너비, 로고, 5개 네비 링크(Dashboard/Automations/Logs/Connections/Settings), 하단 유저 프로필+로그아웃, 모바일에서 햄버거→오버레이 |
| TopNavBar | 랜딩 페이지용, 로고 + Log in + Get Started, 스크롤 시 배경 blur+그림자, 모바일 햄버거 메뉴 |
| FilterBar | 상태 필터 칩(All/Active/Paused 또는 Success/Failed), 날짜 범위, 검색 Input, 클리어 버튼 |
| SchedulePicker | 프리셋 라디오("매일 오전 7시"/"매주 월요일"/"수동 실행만") + 커스텀 시간+요일 선택, 타임존 표시 |
| ToolCallStep | 아코디언: 도구 아이콘+이름+소요시간+상태뱃지, 펼치면 입력 파라미터+출력 결과 JSON |
| ToolCallsTimeline | 수직 라인 연결된 ToolCallStep 리스트 + 최하단 완료 요약(총 시간, 총 토큰) |
| Wizard | StepIndicator + 단계별 컨텐츠 영역 + Back/Next/Submit 버튼, 스텝별 유효성 검증 |
| PricingTable | 3컬럼 카드(Free/Pro/BYOK), 기능별 체크마크 행, 가격 표시, CTA 버튼 |

#### 페이지 구현/리디자인

**`app/(dashboard)/layout.tsx`** — Sidebar 적용
- 기존 상단 네비 → Sidebar 컴포넌트로 교체
- main 영역: `ml-60`(사이드바 너비) + 패딩
- 모바일: 사이드바 숨김 + 햄버거 메뉴

**`app/(dashboard)/page.tsx`** — 대시보드 리디자인
- StatCard 4개 그리드 (Active Automations, Weekly Runs, Token Usage, Success Rate)
- Recent Activity 섹션 (LogEntry 5개)
- Quick Actions (Create Automation, View Logs)
- 빈 상태: 자동화 0개일 때 EmptyState

**`app/(dashboard)/automations/page.tsx`** — 자동화 목록 (기존 파일 없으면 신규)
- 헤더: "My Automations" + "+ New" Button
- FilterBar (All/Active/Paused)
- AutomationCard 그리드 (2~3컬럼)
- 빈 상태: EmptyState

**`app/(dashboard)/automations/new/page.tsx`** — 신규: 자동화 생성 Wizard
- Step 1: 방식 선택 (템플릿 vs 커스텀) — 2개 큰 카드
- Step 2a: 템플릿 선택 (5개 카드 그리드)
- Step 2b: 자연어 프롬프트 입력 (TextArea)
- Step 3: 서비스 연결 확인 (ServiceCard 상태 체크)
- Step 4: SchedulePicker
- Step 5: 요약 + 생성 버튼

**`app/(dashboard)/automations/[id]/page.tsx`** — 신규: 자동화 상세
- 헤더: 이름 + Badge(상태) + Run Now + Pause/Resume + 삭제
- Overview: 프롬프트 표시, 스케줄, 연결 서비스
- Execution History: LogEntry 최근 10개
- Edit 모드: 프롬프트 TextArea + SchedulePicker

**`app/(dashboard)/logs/page.tsx`** — 신규: 로그 목록
- FilterBar (자동화별, 상태별, 날짜)
- LogEntry 리스트 (테이블 형태)
- 페이지네이션
- 빈 상태

**`app/(dashboard)/logs/[id]/page.tsx`** — 신규: 로그 상세 (핵심 차별점)
- Summary Card: 자동화명, 시간, 상태, 토큰
- Result Summary: AI 최종 결과 텍스트
- **ToolCallsTimeline**: 도구 호출 과정 단계별 표시
- Error Section: 실패 시 에러 메시지

**`app/(dashboard)/connections/page.tsx`** — 리디자인
- ServiceCard 그리드 (Google, Notion + 향후 확장 자리)
- 연결 해제 확인 Modal

---

### Phase 4: 나머지 페이지 + 폴리시

**`app/page.tsx`** — 랜딩 페이지 풀 리디자인
- TopNavBar (고정 헤더)
- Hero Section: 대형 헤드라인 + 서브카피 + CTA + 스크린샷/일러스트
- How It Works: 3단계 카드 (연결→설정→자동실행)
- Templates Preview: 5개 템플릿 카드
- PricingTable
- Footer

**`app/onboarding/page.tsx`** — 신규: 온보딩
- Wizard 4단계:
  - Step 1: 환영 + 이름 입력
  - Step 2: 타임존 (자동 감지 + Select)
  - Step 3: 언어 선택
  - Step 4: 첫 자동화 추천

**`app/(dashboard)/settings/page.tsx`** — 신규: 설정
- 탭 네비게이션 (Profile / API Keys / Preferences / Billing / Account)
- Profile: FormField (이름, 타임존, 언어)
- API Keys: Toggle (BYOK) + Input (API 키 마스킹)
- Preferences: Select (뉴스 카테고리 멀티)
- Billing: StatCard (사용량) + PricingTable + CTA
- Account: 계정 삭제 (Danger Zone)

**폴리시 작업**
- 반응형 점검 (1280px, 768px, 375px)
- 인터랙션 상태 누락 체크 (hover/focus/disabled 등)
- 접근성 점검 (aria 속성, 키보드 내비, 포커스 링)
- `/preview` 라우트: 전체 컴포넌트 갤러리 페이지

---

## 6. 파일 변경 요약

### 기존 파일 수정 (10개)

| 파일 | 변경 내용 |
|------|----------|
| `web/package.json` | lucide-react 추가 |
| `web/tailwind.config.ts` | semantic 컬러, 타이포, radius, shadow 토큰 |
| `web/src/app/globals.css` | CSS 변수, 폰트 임포트 |
| `web/src/app/layout.tsx` | 폰트 적용, ToastProvider |
| `web/src/app/(auth)/login/page.tsx` | 컴포넌트 기반 리디자인 |
| `web/src/app/(auth)/signup/page.tsx` | 컴포넌트 기반 리디자인 |
| `web/src/app/(dashboard)/layout.tsx` | Sidebar 적용 |
| `web/src/app/(dashboard)/page.tsx` | 대시보드 리디자인 |
| `web/src/app/(dashboard)/connections/page.tsx` | ServiceCard 적용 |
| `web/src/app/page.tsx` | 랜딩 페이지 풀 리디자인 |

### 신규 파일 생성 (~40개)

| 카테고리 | 파일 수 | 경로 |
|----------|--------|------|
| 유틸리티 | 1 | `src/lib/utils.ts` |
| Atom 컴포넌트 | 14 | `src/components/ui/*.tsx` |
| Form 컴포넌트 | 4 | `src/components/forms/*.tsx` |
| Card 컴포넌트 | 4 | `src/components/cards/*.tsx` |
| Toast 컴포넌트 | 2 | `src/components/toast/*.tsx` |
| Layout 컴포넌트 | 2 | `src/components/layout/*.tsx` |
| Filter 컴포넌트 | 1 | `src/components/filters/*.tsx` |
| Picker 컴포넌트 | 1 | `src/components/pickers/*.tsx` |
| Timeline 컴포넌트 | 2 | `src/components/timeline/*.tsx` |
| Table 컴포넌트 | 1 | `src/components/tables/*.tsx` |
| 신규 페이지 | 6 | `src/app/.../*.tsx` |
| 프리뷰 페이지 | 1 | `src/app/preview/page.tsx` |

---

## 7. Claude Code 실행 가이드

### 실행 순서

Claude Code에서 이 문서를 참조하여 다음 순서로 실행합니다:

```
Phase 1 실행 →  빌드 확인 →
Phase 2 실행 →  Auth 동작 확인 →
Phase 3 실행 →  핵심 페이지 확인 →
Phase 4 실행 →  전체 확인
```

### Phase별 Claude Code 프롬프트 예시

**Phase 1 시작**:
```
Floqi/docs/ui-implementation-plan.md를 읽고 Phase 1을 실행해줘.
디자인 토큰 설정 + Atom 컴포넌트 12개를 구현해.
참고 문서: Floqi/docs/ui-design-guide.md
```

**Phase 2 시작**:
```
ui-implementation-plan.md의 Phase 2를 실행해줘.
Molecule 컴포넌트 10개 + Login/Signup 리디자인.
기존 Supabase Auth 로직은 반드시 유지해.
```

**Phase 3 시작**:
```
ui-implementation-plan.md의 Phase 3를 실행해줘.
Organism 컴포넌트 8개 + 핵심 페이지 8개.
ToolCallsTimeline은 Floqi의 핵심 차별점이니 특히 신경써줘.
```

**Phase 4 시작**:
```
ui-implementation-plan.md의 Phase 4를 실행해줘.
랜딩 페이지 + 온보딩 + 설정 + 반응형 + /preview 갤러리 페이지.
```

### 각 Phase 완료 후 검증

```bash
# 빌드 확인
cd Floqi/web && npm run build

# 기존 테스트 유지
npm run test

# 로컬 실행 (시각적 확인)
npm run dev
```

---

## 8. 참조 문서

| 문서 | 위치 | 용도 |
|------|------|------|
| UI 디자인 가이드 | `Floqi/docs/ui-design-guide.md` | 디자인 원칙, 페이지별 UI 항목, 컬러/타이포/스페이싱 상세 |
| 기술 설계서 | `Floqi/docs/technical-design-document.md` | 시스템 아키텍처, DB 스키마, API 구조 |
| 유저 스토리 | `Floqi/docs/user-stories.md` | 기능 요구사항, 수용 기준 |
| 테스트 케이스 | `Floqi/docs/test-cases.md` | 테스트 시나리오, 기대 결과 |
| 스프린트 백로그 | `Floqi/docs/sprint-backlog.md` | 개발 스프린트별 태스크 |
| Figma 키트 1위 | [AI SaaS Dashboard UI Kit](https://www.figma.com/community/file/1607236562357471469) | 시스템 기반 (토큰, Atom 패턴) |
| Figma 키트 3위 | [Automation Workflow Dashboard](https://www.figma.com/community/file/1579032079446790577) | 도메인 패턴 (자동화 카드, 상태, 히스토리) |
