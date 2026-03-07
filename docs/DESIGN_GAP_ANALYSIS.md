# Design Gap Analysis — Sprint 1

> **Created**: 2026-03-05
> **Sprint**: Sprint 1 — Auth + Google Connection
> **Analyst**: Senior UI/UX Engineer
> **References**: kit1-XX (AI SaaS Dashboard), kit3-XX (Automation Workflow Dashboard)

---

## Executive Summary

Sprint 1 delivered a solid functional foundation — Auth pages with a 2-column layout, a working Connections page, and a 14-component UI library. The architecture and accessibility foundations are strong (proper ARIA, keyboard nav, focus management, TypeScript interfaces).

However, there is a **critical brand identity mismatch**: the design references (kit1, kit3) use a **blue-primary (#2563eb)** color system with near-black dark sidebar navigation, while the current implementation uses **teal (#0D9488)** as its primary color. This single decision creates a pervasive visual divergence across every component.

Additionally, the dashboard layout uses a top navigation bar instead of the design reference's left sidebar — a structural gap that will affect all future Sprint 2+ work. The Connections page's ServiceCard uses a list layout while the reference shows a 3-column card grid.

**Priority distribution**:
- P0 (Critical): 3 issues
- P1 (High): 7 issues
- P2 (Medium): 6 issues
- P3 (Low): 4 issues

---

## 1. Color Scheme Analysis

### Design Reference (kit1-01-color-palette.png, kit1-13-color-token.png)

The reference defines a strict semantic color token system:

| Token | Value | Role |
|-------|-------|------|
| `primary-500` | `#3b82f6` | Blue — interactive elements, links |
| `primary-600` | `#2563eb` | Blue — primary buttons, active states |
| `primary-700` | `#1d4ed8` | Blue — hover states |
| `success-600` | `#16a34a` | Green — connected/active badges |
| `warning-600` | `#d97706` | Amber — warning states |
| `error-600` | `#dc2626` | Red — error states, danger buttons |
| `slate-900` | `#0f172a` | Near-black — sidebar background (active item) |
| `slate-700` | `#334155` | Dark — text headings |
| `slate-500` | `#64748b` | Medium — muted text |
| `slate-50` | `#f8fafc` | Near-white — page background |

The design references for the Automation Workflow kit (kit3) use a **near-black/dark sidebar** for active nav items with white text, and near-white page backgrounds (`#f8fafc`).

### Current Implementation (tailwind.config.ts, globals.css)

| Token | Value | Role |
|-------|-------|------|
| `teal-600` | `#0D9488` | Primary buttons, active toggle, focus rings |
| `indigo-600` | `#4F46E5` | Secondary variant buttons |
| `amber-500` | `#F59E0B` | Accent |
| `success` | `#22c55e` | Success semantic |
| `warning` | `#f59e0b` | Warning semantic |
| `error` | `#ef4444` | Error semantic |
| `neutral-50` | `#f9fafb` | Page background |

The neutral scale uses `gray-*` Tailwind defaults (not the slate palette from the reference).

### Gaps

- [ ] **P0** — **Primary color is teal instead of blue.** Every button, focus ring, toggle, input border, sidebar active item, and link uses `teal-600 (#0D9488)` but the reference system is centered on blue-600 `#2563eb`. This is the largest single visual divergence. Affects: Button (primary), Input (focus), Toggle (checked), ServiceCard badge, login page left panel.
- [ ] **P1** — **Neutral scale is gray instead of slate.** The reference uses `slate-*` values (e.g., `#f8fafc` for bg, `#334155` for headings) while implementation uses standard Tailwind `gray-*`. Subtle but visible at heading and muted text levels.
- [ ] **P1** — **Semantic success token value diverges.** Reference uses `success-600: #16a34a` but implementation uses `#22c55e` (success) — a brighter green. The badge "Connected" green will appear lighter/brighter than reference.
- [ ] **P2** — **No dark sidebar color token defined.** The reference sidebar active state uses near-black `#0f172a` (slate-900). The current implementation has no equivalent token — the sidebar does not exist yet, but when built it will need this.
- [ ] **P2** — **Selection highlight uses teal.** `globals.css` line 79 sets `::selection` to `#ccfbf1` (teal-100 tint). Should use blue-100 `#dbeafe` to match primary.

---

## 2. Typography Analysis

### Design Reference (kit1-02-typography.png)

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Display / H1 | 48px | Bold (700) | Hero headings |
| H2 | 36px | Bold (700) | Section titles |
| H3 | 28px | Semi Bold (600) | Subsection titles |
| H4 | 22px | Semi Bold (600) | Card titles |
| H5 | 18px | Medium (500) | Labels, panel headers |
| H6 | 15px | Medium (500) | Small labels |
| Body Large | 16px | Regular (400) | Primary body text |
| Body | 14px | Regular (400) | Secondary body text |
| Body Small | 13px | Regular (400) | Tertiary, helper text |
| Caption | 11px | Regular (400) | Meta, timestamps |
| Overline | 11px | Semi Bold (600) | Uppercase labels |

The reference font appears to be a clean geometric sans-serif (likely Inter or similar).

### Current Implementation (tailwind.config.ts)

| Token | Size | Weight | Notes |
|-------|------|--------|-------|
| `display-lg` | 48px | 700 | Matches H1 reference |
| `display-sm` | 36px | 700 | Matches H2 reference |
| `heading-lg` | 24px | 600 | **Gap**: Reference H3 is 28px, implementation has 24px |
| `heading-md` | 20px | 600 | **Gap**: Reference H4 is 22px, implementation has 20px |
| `heading-sm` | 16px | 600 | Not in reference scale |
| `body-lg` | 16px | 400 | Matches Body Large |
| `body-md` | 14px | 400 | Matches Body |
| `body-sm` | 12px | 400 | **Gap**: Reference Body Small is 13px |
| `caption` | 11px | 500 | Close — reference is 400 weight |

Font: Implementation uses Inter (loaded via Google Fonts). This matches the reference aesthetic.

### Gaps

- [ ] **P2** — **heading-lg is 24px, reference H3 is 28px.** The `text-2xl` / `heading-lg` tokens are 4px smaller than the reference H3. Page headings like "Connections" and "Welcome back" will appear slightly under-scaled.
- [ ] **P2** — **heading-md is 20px, reference H4 is 22px.** Minor 2px gap; card titles and section headers will be slightly smaller.
- [ ] **P2** — **body-sm is 12px, reference Body Small is 13px.** Helper text and meta information will be slightly smaller than spec.
- [ ] **P3** — **Caption weight is 500 (medium) vs. reference 400 (regular).** Caption text in implementation will appear heavier than reference.
- [ ] **P3** — **No Overline token defined.** The reference has an 11px Semi Bold Overline style used for uppercase section labels (e.g., "TOKEN USAGE · MODEL PERFORMANCE"). This is absent from the token set.

---

## 3. Component Styling

### 3.1 Buttons (kit1-03-buttons.png vs. src/components/ui/Button.tsx)

**Reference** shows:
- Primary: Blue (`#2563eb`) pill-shaped with rounded-full appearance, white text
- Secondary: Light gray background, dark text
- Outline: Blue border, blue text, transparent background
- Ghost: No border, gray text
- Danger: Red (`#dc2626`)
- The reference buttons appear to use `rounded-lg` (not full-radius, but clearly more rounded than the implementation's `rounded-md`)
- All states: default, hover (slightly darker), disabled (opacity-reduced)

**Current Implementation**:
- Uses `rounded-md` (8px) — appears less rounded than reference
- Primary variant uses `bg-teal-600` — wrong brand color
- Secondary variant uses `bg-indigo-600` — the reference secondary is a light gray, not indigo
- Size heights: sm=32px, md=40px, lg=48px — these match the reference proportions well
- Loading spinner is present and accessible

**Gaps**:
- [ ] **P0** — **Primary button color is teal, should be blue-600 (`#2563eb`).** Most visible component divergence from reference.
- [ ] **P1** — **Secondary variant is indigo, reference is light gray.** The indigo secondary competes visually with a hypothetical blue primary. Reference secondary = `bg-gray-100 text-gray-700`.
- [ ] **P1** — **Border radius `rounded-md` (8px) vs. reference which appears ~10-12px.** The reference buttons look more rounded. Changing to `rounded-lg` would better match.
- [ ] **P2** — **No loading state shown in reference** — implementation's spinner is an addition. Keep it (it's an enhancement), but validate it doesn't hurt the form-button visual weight.

### 3.2 Inputs (kit1-04-inputs.png vs. src/components/ui/Input.tsx)

**Reference** shows:
- Default: Light gray border, white background, gray placeholder text
- Focused: Blue border ring (no outer shadow ring — just a clean blue outline)
- Filled: Same as default but with black text
- Invalid: Red border + red dot indicator (inline, to the right of input)
- Disabled: Light gray background, very light text, no interaction

**Current Implementation**:
- Default: `border-gray-300 bg-white` — matches reference
- Focus: `focus:border-teal-500 focus:ring-2 focus:ring-teal-200` — uses teal + ring shadow, reference only shows a clean colored border
- Error: `border-red-500 focus:ring-red-200` — uses red border, correct
- Disabled: `bg-gray-50 text-gray-400` — matches reference

**Gaps**:
- [ ] **P1** — **Focus state uses teal + ring shadow. Reference uses clean blue border only.** The `focus:ring-2 focus:ring-teal-200` adds a visible shadow ring that doesn't appear in the reference. The reference shows only a clean border color change.
- [ ] **P1** — **Focus color is teal, should be blue.** Same brand color issue as buttons.
- [ ] **P2** — **Error indicator placement differs.** Reference shows a red dot indicator inline (to the right inside the input). Implementation shows a border change only — no inline indicator. Error message below is present in both.

### 3.3 Cards (kit1-06-cards.png vs. src/components/ui/Card.tsx)

**Reference** shows:
- Stat cards: White background, subtle border (`#e2e8f0` slate-200), very subtle shadow
- Border radius appears to be ~12px (rounded-xl equivalent)
- Card title: small, muted gray label text
- Card value: large bold number
- Trend indicator: colored badge with arrow + percentage

**Current Implementation**:
- `elevated`: `bg-white shadow-md border border-gray-100` — shadow is heavier than reference
- `outlined`: `bg-white border border-gray-200` — close to reference
- Border radius: `rounded-xl` (16px) — slightly more rounded than reference's apparent ~12px
- No stat card variant exists with title/value/trend structure — the `StatCard` component is in `/cards/` not `/ui/`

**Gaps**:
- [ ] **P2** — **Card elevated shadow is too heavy.** Reference cards use a very subtle `box-shadow: 0 1px 3px rgba(0,0,0,0.06)` style while implementation uses `shadow-md` which is noticeably stronger.
- [ ] **P2** — **Card border color uses gray-100 for elevated, reference uses a visible `slate-200`-equivalent.** The subtle card outline is more visible in the reference.
- [ ] **P3** — **Border radius 16px vs. reference ~12px.** Minor — `rounded-xl` (16px) vs reference ~`rounded-lg` (12px).

### 3.4 Badges (kit1-05-badges-tags.png vs. src/components/ui/Badge.tsx)

**Reference** shows:
- Status badges with a colored dot + text label
- "Active" = green dot + "Active" text, `bg-green-50`, `text-green-700`
- "Error" = red dot + text
- "Warning" = amber dot + text
- "Processing" = blue dot + text
- "Inactive" = gray dot + text
- "Pro" = dark background (near-black), white text — solid badge, no dot
- "Critical" = solid red, white text
- Shape: very rounded (pill, `rounded-full`)
- Small dot uses `•` or a small circle element

**Current Implementation**:
- Uses `rounded-full` — matches pill shape
- `success`: `bg-green-100 text-green-700` — background is heavier than reference's subtle `bg-green-50`
- No dot indicator inside the badge (reference has a small colored dot before text)
- No "Pro" style dark/solid variant
- No dot variant at all

**Gaps**:
- [ ] **P1** — **Badges have no dot indicator.** The reference consistently shows a small colored dot (bullet) before the status text. Implementation has none. The ServiceCard's "연결됨" badge is missing this visual cue.
- [ ] **P2** — **Badge background opacity too strong.** Reference uses `bg-green-50` (very light) while implementation uses `bg-green-100` (more visible). Makes badges feel heavier.
- [ ] **P3** — **No solid/dark badge variant.** Reference has dark "Pro" and solid "Critical" badges for prominence levels. Not needed immediately.

### 3.5 Toggle (kit1-08-toggles.png vs. src/components/ui/Toggle.tsx)

**Reference** shows:
- Radio-button style toggle (circular, not pill-shaped)
- The reference in kit1-08 uses radio-style toggles for off/on with a blue circle indicator
- The kit3 integrations page and component spec (kit3-31) shows a **pill-shaped** toggle with blue fill for "on" state — this is the toggle used in ServiceCards

**Current Implementation**:
- Pill-shaped toggle with teal fill for checked state — correct shape
- Size md: 44px wide × 24px tall (h-6 w-11) — matches reference proportions
- Checked color: `bg-teal-600` — should be `bg-blue-600`

**Gaps**:
- [ ] **P1** — **Toggle active color is teal, should be blue-600.** When enabled, the toggle shows teal. Reference shows blue (`#2563eb`).

### 3.6 Modal (kit1-07-modals.png vs. src/components/ui/Modal.tsx)

**Reference** shows:
- Clean white card, no excessive border radius (approximately 12-16px)
- Title: Bold, ~18px, dark gray `slate-800`
- Close button: `×` icon, top right
- Content: 14px regular body text
- Footer: right-aligned buttons, `Cancel` (outline) + `Confirm` (primary)
- No backdrop blur visible — reference uses semi-transparent black overlay only
- Shadow: Pronounced but clean `box-shadow`

**Current Implementation**:
- `rounded-2xl` (24px) — too rounded, reference is ~12-16px
- Has `backdrop-blur-sm` on overlay — not in reference
- Has proper header/close/content structure — matches reference
- `shadow-xl` — appropriately prominent

**Gaps**:
- [ ] **P2** — **Modal border radius `rounded-2xl` (24px) is too large.** Reference modals appear ~`rounded-xl` (16px). Makes the modal feel soft/bubbly rather than professional.
- [ ] **P2** — **Backdrop blur is not in reference.** The `backdrop-blur-sm` adds a frosted glass effect that isn't in the reference design. Should be plain semi-transparent overlay.

---

## 4. Page-Level Analysis

### 4.1 Auth Pages (kit3-09/10 vs. current login/signup)

**Reference (kit3-09 Login, kit3-10 Signup)**:

The reference auth layout is a split design:
- **Left panel** (~40% width): White/light background, contains logo (circular burst icon), heading ("Hi, Welcome"), subtitle, form fields, OAuth buttons
- **Right panel** (~60% width): Transparent/image placeholder — indicates an illustration or brand imagery slot
- The form is positioned in the LEFT panel, not right
- Logo: Small circular icon (not text-based) with "Flowaxon" text
- Form heading: Large, bold, dark `slate-900`
- Field labels: Small, muted gray above each input
- Input styling: Clean white, light border, with icon prefix (envelope for email, lock for password)
- OAuth buttons: Google and Apple side by side, bordered outline style
- "Login" primary button: Full-width, black/dark gray background, white text — NOT blue
- Remember me: Checkbox + text (left) + Forgot password link (right)

**Current Implementation**:
- **Left panel** (50%): Teal gradient brand panel with marketing copy — this is the OPPOSITE layout from reference
- **Right panel** (50%): Form area — again opposite from reference
- The reference puts the form on the LEFT, brand imagery on the RIGHT
- Primary button color: Teal (should be dark/black per reference, or blue per design system)
- Missing: Apple OAuth button (reference shows both Google + Apple)
- Missing: "Remember me" checkbox
- Missing: "Forgot password?" link
- Input icons: Missing in login page (no envelope/lock prefix icons) — signup page uses FormFieldPassword which may have icons
- Logo: Text-based "Floqi" — reference uses a graphical icon
- Left panel marketing copy: Custom Floqi copy is appropriate, but the gradient (teal) doesn't match reference (light/white)

**Gaps**:
- [ ] **P1** — **Auth layout panel order is reversed.** Reference: form left, image/illustration right. Implementation: brand left, form right. This is a significant structural deviation from the reference layout convention.
- [ ] **P1** — **Left brand panel uses teal gradient, reference uses light/white panel.** The reference auth pages have a light gray/white left panel, not a colored gradient. The form sits on a neutral background.
- [ ] **P1** — **Primary CTA button is teal, reference uses dark near-black.** In kit3 auth pages, the Login/Sign Up button is dark gray or black — not the brand primary color.
- [ ] **P1** — **Missing "Forgot password?" link.** Login page has no forgot password link. This is a user flow gap, not just visual.
- [ ] **P2** — **Missing "Remember me" checkbox.** The reference login form has a checkbox + label in a row.
- [ ] **P2** — **Missing Apple Sign In button.** Reference shows both Google + Apple OAuth. Current login only has Google.
- [ ] **P2** — **Missing input prefix icons.** Reference inputs in auth pages have small icons (envelope, lock, user) inside the input's left side. The login page FormField doesn't use these.

### 4.2 Dashboard Layout (kit3-01 vs. current layout.tsx)

**Reference (kit3-01-dashboard-overview.png)**:
- **Left sidebar** (240px): Logo + search + navigation items grouped as "Home" and "Settings" + "Upgrade Pro Plan" card + user profile at bottom
- Sidebar active item: dark near-black pill background, white text, left blue bar indicator
- Sidebar inactive items: medium gray text, icon-only at left
- **Main content area**: Header with page title, description, primary action buttons (top right)
- Page background: `#f8fafc` (very light near-white)
- Sidebar background: White (`#ffffff`)
- Nav collapse/expand: Toggle button (kit3-36 shows both expanded and collapsed icon-only states)

**Current Implementation**:
- **Top navigation bar**: Logo left, nav links in center, logout button right
- This is a top-nav pattern, not left-sidebar
- No search functionality
- No sidebar collapse functionality
- No "Upgrade" upsell card
- No user profile section

**Gaps**:
- [ ] **P0** — **Missing left sidebar navigation.** The reference uses a persistent left sidebar (240px) with logo, search, nav groups, upgrade card, and user profile. The current implementation has a horizontal top-nav bar. This is the most structurally significant gap that will affect all future pages. The sidebar needs to be built for Sprint 2.
- [ ] **P1** — **Missing search bar in sidebar.** Reference has a `Search` input with keyboard shortcut indicator (⌘K) at the top of the sidebar.
- [ ] **P2** — **Missing "Upgrade Pro Plan" upsell card.** Reference sidebar has a gradient-bordered upgrade card at the bottom before the user profile.
- [ ] **P2** — **No sidebar collapse/expand behavior.** Reference (kit3-36) shows a collapsed state with icon-only display. Required for responsive desktop UX.

### 4.3 Connections / Integrations Page (kit3-05 vs. current connections/page.tsx)

**Reference (kit3-05-integrations-page.png)**:
- Page title "Integrations" + subtitle + "+ Add Integration" button (top right)
- Service cards in a **3-column grid** layout
- Each card:
  - Service icon (colored brand logo, ~40px, no border box)
  - Service name (bold, ~16px)
  - Short description text (truncated, ~14px muted)
  - Toggle switch (right side) — enabled=blue, disabled=gray
  - External link icon (top right of card)
  - Card: White background, subtle border, `rounded-xl`, minimal padding
- Cards are NOT using a button for connect/disconnect — they use a toggle
- No "connected since" date shown on card
- No scope display on card

**Current Implementation**:
- Single-column list of `ServiceCard` components
- Each card shows: logo placeholder (just "G" text), service name, connected/disconnected badge, connected date, scope permissions, connect/disconnect button
- Only Google service is shown (intended for MVP)
- Layout: List, not grid
- Uses Button (not Toggle) for connect/disconnect action

**Gaps**:
- [ ] **P1** — **Single-column list vs. 3-column card grid.** The reference integrations page uses a responsive grid layout. Even with one service (Google), the page feels sparse as a single-column list. The grid structure should be prepared.
- [ ] **P1** — **Service logo is placeholder text "G".** The reference uses actual colored brand icons/logos. The Google "G" is just a letter span. Even a minimal SVG Google logo would significantly improve quality.
- [ ] **P1** — **Connect action uses Button, reference uses Toggle.** The reference integrations page uses a toggle switch to enable/disable each integration, not a connect/disconnect button. The toggle is more in line with the reference UX pattern. The current button-based approach is more explicit but diverges from the reference pattern.
- [ ] **P2** — **Missing "+ Add Integration" header action button.** The reference page has a prominent action button in the page header area (top right). Connections page has no page-level action buttons.
- [ ] **P2** — **Scope permissions text is too verbose.** The reference shows only service name + short description. The current implementation shows full OAuth scope URLs which are technical and noisy.
- [ ] **P2** — **Missing page subtitle/description text.** Reference page has "Here's a quick summary of your automation workflows today." subheading under the page title.

---

## 5. Priority Fix List

### P0 (Critical) — Fix Now

1. **Primary color: Teal → Blue-600 (`#2563eb`)**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/tailwind.config.ts`
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/app/globals.css`
   - Impact: Cascades to Button primary, Toggle checked, Input focus, all teal-colored UI elements
   - Action: Add `blue` primary scale to Tailwind config. Replace `teal-600` with `blue-600` across all components.

2. **Build left sidebar navigation**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/app/(dashboard)/layout.tsx`
   - File: Create `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/components/nav/Sidebar.tsx`
   - Impact: Every dashboard page is missing the reference's left-sidebar shell
   - Action: Replace top-nav with left sidebar. Include logo, search placeholder, nav groups (Home: Dashboard, Automations, Integrations / Settings: Log Activity, Team Access, Notifications), user profile at bottom.

3. **Google logo in ServiceCard**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/app/(dashboard)/connections/page.tsx`
   - Impact: "G" text placeholder is unprofessional in a demo/MVP context
   - Action: Replace `<span>G</span>` with a proper Google SVG icon (same multicolor SVG already in login page).

### P1 (High) — Next Sprint

1. **Secondary button variant: Indigo → Light gray**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/components/ui/Button.tsx`
   - Action: Change `secondary` variant from `bg-indigo-600 text-white` to `bg-gray-100 text-gray-700 hover:bg-gray-200`

2. **Button border radius: `rounded-md` → `rounded-lg`**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/components/ui/Button.tsx`
   - Action: Update base className from `rounded-md` to `rounded-lg` to better match reference appearance

3. **Input focus: Remove ring shadow, change color to blue**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/components/ui/Input.tsx`
   - Action: Replace `focus:border-teal-500 focus:ring-2 focus:ring-teal-200` with `focus:border-blue-500 focus:ring-2 focus:ring-blue-100` (lighter ring) or `focus:border-blue-500 focus:outline-none`

4. **Badge: Add dot indicator before text**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/components/ui/Badge.tsx`
   - Action: Add a `<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />` before the text content as the default pattern.

5. **Auth page layout: Clarify panel order**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/app/(auth)/login/page.tsx`
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/app/(auth)/signup/page.tsx`
   - Action: Evaluate whether to match reference (form left, image right) or keep current (brand left, form right). If matching reference, swap the panel order and change the left panel from a gradient to a light/neutral background.

6. **Login page: Add "Forgot password?" link**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/app/(auth)/login/page.tsx`
   - Action: Add a `<a href="/forgot-password">Forgot password?</a>` link below/beside the password field. This is a UX gap that affects user flow.

7. **Connections page: Replace toggle for connect/disconnect with pill card grid**
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/app/(dashboard)/connections/page.tsx`
   - File: `/Users/kimseunghwan/ClaudProjects/Floqi/web/src/components/cards/ServiceCard.tsx`
   - Action: Restructure ServiceCard to use Toggle (not Button) for connection state. Update page layout to use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.

### P2 (Medium) — Future Sprints

1. **Typography token alignment** — Increase heading-lg from 24px to 28px and heading-md from 20px to 22px in `tailwind.config.ts` to match reference H3/H4 scale.

2. **Card shadow weight** — Change `Card` elevated variant from `shadow-md` to `shadow-sm` (0 1px 3px rgba(0,0,0,0.06)) to match the subtler reference card appearance.

3. **Badge background opacity** — Change badge variant backgrounds from `-100` to `-50` level (e.g., `bg-green-50` instead of `bg-green-100`) to match lighter reference style.

4. **Modal border radius** — Change `rounded-2xl` to `rounded-xl` in Modal component. Remove `backdrop-blur-sm` from overlay.

5. **Auth: Add input prefix icons** — Add envelope icon to email inputs and lock icon to password inputs, consistent with reference (kit3-09/10). Use existing icon library (lucide-react).

6. **Connections page: Remove scope URL text** — Replace raw OAuth scope URLs with human-readable permission descriptions (e.g., "Read emails", "View calendar", "Send emails").

### P3 (Low) — Future Improvements

1. **Overline typography token** — Add an `overline` style (11px, 600, uppercase, letter-spacing) for section labels.
2. **Caption weight correction** — Change caption weight from 500 to 400 to match reference.
3. **Solid badge variant** — Add dark/solid variant for "Pro" tier indicators.
4. **Selection highlight color** — Update `::selection` background from `#ccfbf1` (teal) to `#dbeafe` (blue-100) when primary color is changed.

---

## 6. Recommended Action Plan

### Quick Wins (under 2 hours)

- [ ] **Add Google SVG logo to ServiceCard** — Replace `<span>G</span>` with the same SVG already in login.tsx. 10 minutes.
- [ ] **Add "Forgot password?" link to login page** — Simple anchor tag addition. 15 minutes.
- [ ] **Change Badge background to -50 variants** — Find/replace in Badge.tsx. 10 minutes.
- [ ] **Remove backdrop-blur from Modal** — Single line change in Modal.tsx. 5 minutes.
- [ ] **Change Modal border radius from rounded-2xl to rounded-xl** — Single line change. 5 minutes.
- [ ] **Add dot indicator to Badge component** — Add a small span element before badge text. 20 minutes.

### Medium Effort (2-4 hours)

- [ ] **Primary color migration: teal → blue** — Update tailwind.config.ts, globals.css, and all component files that use `teal-*` classes (Button, Input, Toggle, auth pages). Requires search-replace across ~8 files plus regression testing.
- [ ] **Button secondary variant + border radius update** — Update Button.tsx variant styles. 30 minutes.
- [ ] **Input focus style update** — Update Input.tsx focus classes. 20 minutes.
- [ ] **Connections page: Grid layout + scope text cleanup** — Restructure page layout to CSS grid, clean up scope display. 1 hour.

### Larger Refactors (4+ hours)

- [ ] **Left sidebar navigation** — Build `Sidebar.tsx` component with: logo, search input, nav groups with icons, active/hover states, collapse/expand behavior, user profile section at bottom. Update dashboard layout.tsx to use sidebar instead of top-nav. Requires new icon set integration (lucide-react icons are already available). Estimated: 6-8 hours.
- [ ] **Auth page panel restructure** — Evaluate design decision (form-left vs brand-left), implement "Forgot password" page, add Apple OAuth button, add "Remember me" checkbox. Estimated: 3-4 hours.
- [ ] **ServiceCard toggle-based connect flow** — Redesign ServiceCard to use Toggle for connect/disconnect with appropriate confirmation pattern. Estimated: 2-3 hours.

---

## 7. Component Quality Assessment

| Component | Accessibility | Reference Alignment | Priority |
|-----------|---------------|---------------------|----------|
| Button | Excellent | Color mismatch (teal vs blue), radius slightly off | P0 color, P1 radius |
| Input | Excellent | Focus color + ring style mismatch | P1 |
| Card | Good | Shadow too heavy, radius slightly large | P2 |
| Badge | Good | Missing dot indicator, bg too opaque | P1 |
| Toggle | Excellent | Color mismatch only | P1 |
| Modal | Excellent | Radius too large, blur not in reference | P2 |
| ServiceCard | Good | List vs grid, placeholder logo, button vs toggle | P0 logo, P1 layout+toggle |
| FormField | Excellent | Missing input prefix icons | P2 |
| Dashboard Layout | Good | Missing sidebar entirely | P0 |
| Login Page | Good | Color, panel order, missing links | P1 |
| Signup Page | Good | Color, panel order | P1 |

---

## 8. Files Requiring Changes

### High Impact (P0/P1)

| File | Changes Needed | Priority |
|------|---------------|----------|
| `/web/tailwind.config.ts` | Add blue as primary, remove teal as primary | P0 |
| `/web/src/app/globals.css` | Update CSS variables to blue primary | P0 |
| `/web/src/components/ui/Button.tsx` | Primary=blue, secondary=gray, rounded-lg | P0+P1 |
| `/web/src/components/ui/Input.tsx` | Focus=blue, simplify ring | P1 |
| `/web/src/components/ui/Toggle.tsx` | Checked=blue-600 | P1 |
| `/web/src/components/ui/Badge.tsx` | Add dot, lighten backgrounds | P1 |
| `/web/src/app/(dashboard)/layout.tsx` | Replace top-nav with left sidebar | P0 |
| `/web/src/components/nav/Sidebar.tsx` | Create new component | P0 |
| `/web/src/app/(auth)/login/page.tsx` | Add forgot password, fix colors | P1 |
| `/web/src/app/(dashboard)/connections/page.tsx` | Grid layout, proper logo | P0+P1 |
| `/web/src/components/cards/ServiceCard.tsx` | Toggle-based connect, icon support | P1 |

### Medium Impact (P2)

| File | Changes Needed | Priority |
|------|---------------|----------|
| `/web/src/components/ui/Modal.tsx` | radius, remove blur | P2 |
| `/web/src/components/ui/Card.tsx` | lighter shadow | P2 |
| `/web/src/app/(auth)/signup/page.tsx` | panel color, input icons | P2 |

---

*Analysis based on direct comparison of kit1-01 through kit1-22 (AI SaaS Dashboard) and kit3-01 through kit3-38 (Automation Workflow Dashboard) design references against the Sprint 1 implementation codebase.*
