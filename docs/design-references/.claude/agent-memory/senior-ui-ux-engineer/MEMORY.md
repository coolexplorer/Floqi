# Senior UI/UX Engineer — Project Memory

## Floqi Project

**Web app**: `/Users/kimseunghwan/ClaudProjects/Floqi/web`
**Design refs**: `/Users/kimseunghwan/ClaudProjects/Floqi/docs/design-references/`

### Design Reference Kit Structure
- `kit1-XX` = AI SaaS Dashboard (component specs: colors, typography, buttons, inputs, cards, etc.)
- `kit3-XX` = Automation Workflow Dashboard (page-level screenshots + component variants)
- `RENAME_LOG.md` maps descriptive names to all 38 kit3 files

### Confirmed Design System (from kit1-01, kit1-13)
- **Primary**: blue-600 `#2563eb` (NOT teal)
- **Neutral/bg**: slate-50 `#f8fafc`, slate-700 `#334155` for headings
- **Success**: green-600 `#16a34a`
- **Warning**: amber-600 `#d97706`
- **Error**: red-600 `#dc2626`
- **Sidebar active**: near-black `#0f172a` (slate-900), white text

### Critical Implementation Gap (Sprint 1)
The codebase uses teal (`#0D9488`) as primary color — **wrong**. Reference is blue (`#2563eb`).
All P0 fixes require changing teal → blue across:
- `tailwind.config.ts` — add blue primary, deprecate teal as primary
- `globals.css` — `--color-primary` CSS var
- `Button.tsx` — primary variant bg
- `Input.tsx` — focus border/ring color
- `Toggle.tsx` — checked background
- Auth pages — left panel gradient

### Dashboard Layout Gap (P0)
Current: horizontal top-nav bar.
Reference (kit3-01): left sidebar 240px — logo, search, nav groups, upgrade card, user profile.
Sidebar must be built in Sprint 2. File to create: `src/components/nav/Sidebar.tsx`.

### Key Component Deviations (see DESIGN_GAP_ANALYSIS.md for full list)
- Badge: missing colored dot indicator before text
- Button: `rounded-md` should be `rounded-lg`; secondary should be gray not indigo
- Modal: `rounded-2xl` → `rounded-xl`; remove `backdrop-blur-sm`
- ServiceCard: uses Button for connect/disconnect, reference uses Toggle; list layout vs. 3-column grid
- Auth pages: form on right, reference has form on left; missing forgot password link

### Full Analysis
`/Users/kimseunghwan/ClaudProjects/Floqi/docs/DESIGN_GAP_ANALYSIS.md`
