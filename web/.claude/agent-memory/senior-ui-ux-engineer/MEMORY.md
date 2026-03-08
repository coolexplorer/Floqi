# Senior UI/UX Engineer — Floqi Project Memory

## Project

- **Name**: Floqi (AI Personal Autopilot)
- **Web**: `/Users/kimseunghwan/ClaudProjects/Floqi/web` — Next.js 15, TypeScript, Tailwind CSS
- **Design tokens**: `/Users/kimseunghwan/ClaudProjects/Floqi/docs/design-tokens.json`
- **Token docs**: `/Users/kimseunghwan/ClaudProjects/Floqi/docs/DESIGN_TOKENS.md`
- **Design references**: `/Users/kimseunghwan/ClaudProjects/Floqi/docs/design-references/AI SaaS Dashboard/`

## Design System

### Brand Colors
- Primary blue: `#2563eb` (primary.600) — main CTAs, active states
- Background: `#f8fafc` (slate.50)
- Card bg: `#ffffff`
- Primary text: `#0f172a` (slate.900)
- Secondary text: `#475569` (slate.600)
- Muted text: `#94a3b8` (slate.400)
- Border: `#e2e8f0` (slate.200)

### Typography
- Font: Inter, Pretendard, system-ui
- Scale: display(48/56/700), h2(36/44/700), h3(28/36/600), h4(22/30/600), h5(18/26/500), h6(15/22/500)
- Body: body-large(16/24), body(14/20), body-small(13/18), caption(11/16), overline(11/16/600/uppercase)

### Key Component Sizes
- Button height: sm=32px, md=40px, lg=48px; border-radius: 6px
- Input height: 40px; border-radius: 8px
- Card: border-radius: 12px; padding: 20px; shadow: card
- Badge: height 24px; border-radius: 9999px (pill); font 12px/500
- Sidebar width: 240px

### Semantic Color Pattern
- Success: green (dot=#22c55e, text=#16a34a, bg=#f0fdf4)
- Warning: amber (dot=#f59e0b, text=#b45309, bg=#fffbeb)
- Error: red (dot=#ef4444, text=#dc2626, bg=#fef2f2)
- Processing/Info: blue (dot=#3b82f6, text=#2563eb, bg=#eff6ff)

## A11y Audit Findings (2026-03-07)

Full report: `/Users/kimseunghwan/ClaudProjects/Floqi/web/a11y-audit-report.md`

### Known Issues (unresolved)
- `slate-400` (#94a3b8) fails contrast 4.5:1 on white — use `slate-500` for meaningful text
- Dashboard layout (`(dashboard)/layout.tsx`) uses a nav stub, NOT the `Sidebar` component
- `settings/page.tsx` has two inline `<div>` modals — not the accessible `<Modal>` component
- `automations/[id]/page.tsx` uses `window.confirm()` for delete — replace with `<Modal>`
- No skip-navigation link exists anywhere in the app
- `Modal.tsx` has no full focus trap (Tab can escape to background)
- `SchedulePicker.tsx` labels not associated via `htmlFor` to their Select controls
- `Tooltip.tsx` uses a static `id="floqi-tooltip"` — duplicate IDs if multiple tooltips shown
- Loading states (`<div>Loading...</div>`) lack `role="status"` across all pages
- `LogEntry.tsx` uses `role="button"` on `<div>` — prefer native `<button>` element

### Working Well
- `Button`, `FormField`, `Input`, `Toggle`, `Badge` components have solid ARIA patterns
- `FilterBar` status pills use `role="radio"` + `aria-checked` + `role="group"` correctly
- `TopNavBar` has correct `aria-expanded`, `aria-controls` on mobile menu toggle
- `Modal.tsx` has ESC close, body scroll lock, portal rendering, `aria-modal="true"`
- `StepIndicator` uses `aria-current="step"` correctly
- `FormFieldPassword` toggle has correct `aria-label` for show/hide
