# Sprint 9 구현 문서 (Post-MVP P1: 온보딩 + BYOK + 선호도 설정)

> **기간**: Post-MVP P1
> **목표**: 사용자 초기 설정 UX 개선 (온보딩), BYOK API 키 관리, AI 개인화 선호도 설정
> **완료일**: 2026-03-07

---

## 1. 개요

### 1.1 완료된 User Stories
- US-104: 첫 로그인 시 온보딩 플로우 (타임존/언어 초기 설정) ✅
- US-702: BYOK Anthropic API 키 등록/삭제 ✅
- US-703: 선호도 설정 (뉴스 카테고리, 이메일 중요도 기준) ✅

### 1.2 Story Points
- PM-01: 5 SP ✅ | PM-07: 3 SP ✅ | PM-08: 3 SP ✅ — **합계: 11 SP**

---

## 2. 컴포넌트별 구현 사항

### 2.1 PM-01: 온보딩 플로우

#### OnboardingPage (`web/src/app/(dashboard)/onboarding/page.tsx`)

**구현 로직**:
```
1. 마운트 시 Supabase에서 프로필 조회
2. onboarding_completed=true이면 → /dashboard 리다이렉트 (완료된 사용자 차단)
3. UI: 타임존 select + 언어 select (한국어/영어)
4. "시작하기" 클릭:
   - profiles UPDATE: timezone, preferred_language, onboarding_completed=true
   - router.push('/dashboard')
```

#### 미들웨어 온보딩 체크 (`web/src/middleware.ts`)

**추가된 로직**:
```
인증된 사용자 + /dashboard 접근
  → profiles에서 onboarding_completed 조회
  → false → /onboarding 리다이렉트

인증된 사용자 + /onboarding 접근
  → onboarding_completed=true → /dashboard 리다이렉트

matcher에 '/onboarding' 추가
```

---

### 2.2 PM-07: BYOK API 키 등록/삭제

#### Settings 페이지 BYOK 섹션 (`web/src/app/(dashboard)/settings/page.tsx`)

**저장 로직**:
```
1. 입력값 검증: 빈 문자열 → 에러
2. 형식 검증: 'sk-ant-' 시작 여부 확인
3. encrypt(apiKey) → 암호화
4. profiles UPDATE: llm_provider='byok', llm_api_key_encrypted=암호화값
```

**Managed 전환**:
- 확인 모달 → profiles UPDATE: llm_provider='managed', llm_api_key_encrypted=null

---

### 2.3 PM-08: 선호도 설정 UI

#### Settings 페이지 선호도 섹션

**뉴스 카테고리**: 체크박스 5개 (technology, science, business, health, sports)
- upsert: `{ category: 'content', key: 'news_categories', value: ["technology","science"] }`

**이메일 중요도**: select (sender / subject keyword / all)
- upsert: `{ category: 'email', key: 'importance_criteria', value: "sender" }`

---

## 3. 테스트 결과

| 구분 | Before | After | 신규 |
|------|--------|-------|------|
| Web 테스트 | 378 | **410** | +32 |

- type-check: ✅ 에러 0 | lint: ✅ 에러 0 | 머지: ✅ main

---

## 4. 남은 이슈

- [ ] Lint warning 4건 (기존): `<a>` → `<Link>`, `<img>` → `<Image>`

---

## 5. Post-MVP P1 진행 현황

| PM | 내용 | SP | 상태 |
|----|------|----|------|
| PM-01 | 온보딩 플로우 | 5 | ✅ Sprint 9 |
| PM-02 | Notion OAuth | 5 | ✅ Sprint 8 |
| PM-03 | 토큰 갱신 실패 알림 | 3 | ✅ Sprint 8 |
| PM-04~06 | 템플릿 3종 + Webhook | 15 | ✅ Sprint 7 |
| PM-07 | BYOK UI | 3 | ✅ Sprint 9 |
| PM-08 | 선호도 설정 | 3 | ✅ Sprint 9 |
| PM-14 | Rate Limiting | 3 | ✅ Sprint 8 |
| **완료 합계** | | **37 SP** | |
| PM-09~13, PM-15 | 결제, 사용량, 마스킹 등 | 20 SP | ⬜ 미완료 |

---

**Sprint 9 완료** ✅ — 다음: Sprint 10 (PM-09 요금제 UI + PM-11 사용량 대시보드 등)
