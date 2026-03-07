# Floqi Design References — Figma 추출 가이드

이 폴더에 Figma 키트에서 추출한 파일들을 저장합니다.
Claude Code가 UI 구현 시 참조합니다.

---

## 저장할 파일 목록

### 1. 스크린샷 (PNG) — `design-references/` 폴더

Figma에서 해당 프레임을 선택 → 우클릭 → **Export** → PNG (2x)

**AI SaaS Dashboard UI Kit (1위 키트 — 시스템 기반)**

| 파일명 | Figma에서 캡처할 영역 | 용도 |
|--------|---------------------|------|
| `kit1-01-color-palette.png` | Colors / Color Styles 페이지 | 컬러 토큰 확인 |
| `kit1-02-typography.png` | Typography 페이지 | 폰트 스케일 확인 |
| `kit1-03-buttons.png` | Buttons 컴포넌트 전체 | 버튼 variant 참고 |
| `kit1-04-inputs.png` | Inputs / Form Elements 페이지 | 인풋 스타일 참고 |
| `kit1-05-badges-tags.png` | Badges / Tags 컴포넌트 | 뱃지 스타일 참고 |
| `kit1-06-cards.png` | Cards 컴포넌트 | 카드 패턴 참고 |
| `kit1-07-modals.png` | Modals / Dialogs 컴포넌트 | 모달 패턴 참고 |
| `kit1-08-toggles.png` | Toggles / Switches 컴포넌트 | 토글 스타일 참고 |
| `kit1-09-stats-dashboard.png` | Dashboard 스크린 전체 | 대시보드 레이아웃 + Stats 카드 |
| `kit1-10-tables.png` | Tables / Data Display 페이지 | 테이블 패턴 참고 |
| `kit1-11-toasts.png` | Alerts / Toasts 컴포넌트 | 토스트 스타일 참고 |
| `kit1-12-sidebar.png` | Navigation / Sidebar 영역 | 사이드바 레이아웃 참고 |

**Automation Workflow Dashboard UI Kit (3위 키트 — 도메인 패턴)**

| 파일명 | Figma에서 캡처할 영역 | 용도 |
|--------|---------------------|------|
| `kit3-01-automation-cards.png` | Automation / Workflow 카드 목록 | 자동화 카드 패턴 |
| `kit3-02-status-badges.png` | Status 표시 영역 (Active/Paused/Error) | 상태 뱃지 패턴 |
| `kit3-03-execution-history.png` | Run History / Logs 영역 | 실행 이력 리스트 패턴 |
| `kit3-04-workflow-detail.png` | Workflow 상세 화면 | 자동화 상세 레이아웃 |
| `kit3-05-trigger-schedule.png` | Trigger / Schedule 설정 영역 | 스케줄 설정 UI 패턴 |
| `kit3-06-dashboard-overview.png` | 대시보드 메인 화면 | 전체 레이아웃 참고 |
| `kit3-07-empty-states.png` | Empty State 화면들 | 빈 상태 디자인 참고 |
| `kit3-08-connections.png` | Integration / Connection 영역 | 서비스 연결 카드 참고 |

### 2. 디자인 토큰 (JSON) — `design-tokens/` 폴더

**방법 A: Tokens Studio 플러그인 사용 (권장)**
1. Figma → Plugins → "Tokens Studio for Figma" 설치
2. 1위 키트 열기 → Tokens Studio 실행
3. Export → JSON 선택
4. `design-tokens/kit1-tokens.json` 으로 저장

**방법 B: 수동 추출**
Figma 오른쪽 패널 Design 탭에서 Local Styles 확인 후 아래 형식으로 직접 작성:
`design-tokens/manual-tokens.json` 으로 저장

```json
{
  "colors": {
    "primary": {
      "50": "값", "100": "값", "200": "값",
      "500": "값", "600": "값", "900": "값"
    },
    "secondary": { ... },
    "neutral": { ... },
    "success": "값",
    "warning": "값",
    "error": "값",
    "info": "값"
  },
  "typography": {
    "fontFamily": {
      "sans": "값 (예: Inter, sans-serif)",
      "heading": "값"
    },
    "fontSize": {
      "xs": "값", "sm": "값", "base": "값",
      "lg": "값", "xl": "값", "2xl": "값",
      "3xl": "값", "4xl": "값"
    }
  },
  "spacing": {
    "1": "4px", "2": "8px", "3": "12px",
    "4": "16px", "5": "20px", "6": "24px",
    "8": "32px", "10": "40px", "12": "48px"
  },
  "borderRadius": {
    "sm": "값", "md": "값", "lg": "값", "xl": "값", "full": "9999px"
  },
  "boxShadow": {
    "sm": "값", "md": "값", "lg": "값"
  }
}
```

### 3. 컴포넌트 CSS (선택) — `design-tokens/` 폴더

Figma Dev Mode 또는 Inspect 탭에서 주요 컴포넌트의 CSS를 복사하여 저장:
`design-tokens/component-styles.css`

---

## Claude Code에서 활용하는 방법

```
# Phase 1 시작 시
Floqi/docs/design-references/ 폴더의 스크린샷과
Floqi/docs/design-tokens/ 폴더의 토큰 JSON을 참고하여
ui-implementation-plan.md Phase 1을 구현해줘.
```

---

## 폴더 구조

```
Floqi/docs/
├── design-references/        ← 스크린샷 PNG 저장
│   ├── README.md             ← 이 파일
│   ├── kit1-01-color-palette.png
│   ├── kit1-02-typography.png
│   ├── ...
│   ├── kit3-01-automation-cards.png
│   └── ...
├── design-tokens/            ← 토큰 JSON/CSS 저장
│   ├── kit1-tokens.json      (Tokens Studio 추출)
│   ├── manual-tokens.json    (수동 작성)
│   └── component-styles.css  (선택)
└── ...
```
