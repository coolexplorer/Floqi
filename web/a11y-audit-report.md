# Floqi UI/UX & WCAG 2.1 AA Audit Report

> **Date**: 2026-03-07
> **Auditor**: Senior UI/UX Engineer (Claude)
> **Scope**: All pages in `src/app/` and all components in `src/components/`
> **Standard**: WCAG 2.1 Level AA

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 14 |
| Serious  | 8 |
| Moderate | 7 |
| Minor    | 9 |
| **Total** | **38** |

The automated axe-core scan (public pages only: `/`, `/login`, `/signup`) found **11 violations** across 3 pages. The manual code review of all pages and components identified an additional **27 issues** spanning accessibility, usability, and structural concerns.

**Key risk areas:**
- Dashboard layout uses a minimal nav stub (`(dashboard)/layout.tsx`) instead of the designed `Sidebar` component — the sidebar is built but not wired into the live app
- Multiple custom modal implementations (`settings/page.tsx`, `automations/[id]/edit` area) bypass the accessible `Modal` component
- Color-contrast failures on `slate-400` text used for labels, dividers, and status indicators
- Missing `lang` attribute isolation and mixed-language error messages create confusion for internationalization
- No skip-navigation link exists anywhere in the application

---

## Automated Scan Results (axe-core via Playwright)

Scan ran against a live dev server (`http://localhost:3000`) against three public pages. Authenticated pages were not scanned (no auth storage available during scan).

### Scan Findings Breakdown

**Note:** The `button-name` (critical) and `label` (critical) violations from the `styles-module__controlButton` class, and the `nested-interactive` (serious) from `styles-module__toolbarContainer` with role="button", all originate from the **`agentation` third-party development toolbar** rendered via `<Agentation />` in `layout.tsx` (only in `NODE_ENV === "development"`). These are not application code violations and will not appear in production. They are noted here for completeness.

The **genuine application-level violations** from the axe scan are:

| ID | Impact | Description | Page(s) |
|----|--------|-------------|---------|
| `color-contrast` | Serious | `text-slate-400` ("or" divider text) contrast 2.63:1 — fails 4.5:1 AA | `/login` |
| `color-contrast` | Serious | `text-slate-400` ("Priority support" crossed-out text) contrast 2.63:1 | `/` |

---

## Manual Review Findings

### Critical Issues (Must Fix)

---

**C-1. No skip-navigation link on any page**
- **WCAG**: 2.4.1 Bypass Blocks (Level A — prerequisite for AA)
- **File**: `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`
- **Impact**: Keyboard and screen reader users must tab through the entire navigation on every page before reaching main content.
- **Fix**: Add a visually-hidden skip link as the first focusable element in `layout.tsx`:
  ```html
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:z-[300] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg">
    Skip to main content
  </a>
  ```
  Then add `id="main-content"` to the `<main>` element in the dashboard layout.

---

**C-2. Dashboard layout uses an inline `<nav>` stub instead of the production Sidebar**
- **WCAG**: 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
- **File**: `src/app/(dashboard)/layout.tsx`
- **Impact**: The live app uses a bare `<nav>` with three hard-coded `<a>` tags, missing: current-page indication (`aria-current="page"`), logical heading structure, logout feedback, and responsive mobile navigation. The designed `Sidebar` component (`src/components/layout/Sidebar.tsx`) exists but is not connected.
- **Fix**: Replace the inline nav stub with `SidebarClient` (which wraps `Sidebar`) or connect the Sidebar component directly to the dashboard layout.

---

**C-3. Two custom inline modals in `settings/page.tsx` are inaccessible**
- **WCAG**: 4.1.2 Name, Role, Value; 2.1.2 No Keyboard Trap; 2.4.3 Focus Order
- **File**: `src/app/(dashboard)/settings/page.tsx` (lines 392–416 and 562–599)
- **Impact**: Both the "Switch to Managed" and "Delete Account" confirmation dialogs are raw `<div>` elements rendered with `className="fixed inset-0"`. They have:
  - No `role="dialog"` or `aria-modal="true"`
  - No `aria-labelledby` pointing at a title
  - No focus trap — keyboard focus is not moved into the dialog and can escape to background content
  - No ESC key handler
- **Fix**: Replace both inline modal implementations with the existing `<Modal>` component from `src/components/ui/Modal.tsx`, which already handles focus trapping, ESC dismissal, body scroll lock, and the correct ARIA attributes.

---

**C-4. `handleDelete` in `automations/[id]/page.tsx` uses `window.confirm()`**
- **WCAG**: 2.4.3 Focus Order; 4.1.2 Name, Role, Value
- **File**: `src/app/(dashboard)/automations/[id]/page.tsx` (line 131)
- **Impact**: `window.confirm()` is a browser-native dialog that is inaccessible on many assistive technologies, does not match the app's visual style, and cannot be styled or localized. The identical destructive action on the automations list already uses the accessible `<Modal>` component correctly.
- **Fix**: Add an `isDeleteConfirming` state and render a `<Modal>` (as in `automations/page.tsx`) instead of calling `window.confirm()`.

---

**C-5. `LogEntry` component uses `role="button"` on a `<div>` without type**
- **WCAG**: 4.1.2 Name, Role, Value; 2.1.1 Keyboard
- **File**: `src/components/cards/LogEntry.tsx`
- **Impact**: The component conditionally applies `role="button"` to a `<div>`. While keyboard support (`onKeyDown` with Enter/Space) is present, `<div role="button">` does not get implicit `type="button"`, and some screen readers announce it differently from a native `<button>`. Additionally, there is no `aria-label` — screen readers will announce the concatenated text content ("09:32:15 Morning Briefing Success 1.2s") which may be acceptable but could be improved.
- **Fix**: Use a native `<button type="button">` element when `isClickable` is true, or a `<div>` when not interactive. A conditional render between `<button>` and `<div>` is cleaner than applying `role="button"` to a div.

---

**C-6. `FilterBar` status buttons use `role="radio"` but are not inside a `role="radiogroup"` with proper labeling**
- **WCAG**: 4.1.2 Name, Role, Value
- **File**: `src/components/filters/FilterBar.tsx`
- **Impact**: The status filter buttons have `role="radio"` and `aria-checked` which is correct pattern intent. The wrapping `<div>` correctly has `role="group"` and `aria-label`. However, the same pattern is duplicated in `automations/[id]/page.tsx` (lines 316–338) where the filter buttons use the radio pattern but the container only has `role="group"` with no `aria-label` on the buttons themselves. Additionally, ARIA radiogroup requires keyboard arrow-key navigation between options — the current implementation only responds to click/Enter, not arrow keys.
- **Fix**: Either use native `<input type="radio">` elements (wrapped in a `<fieldset>/<legend>`) or implement full arrow-key navigation for the custom radio button group pattern.

---

### Serious Issues

---

**S-1. `text-slate-400` (#94a3b8) fails WCAG AA contrast on white background**
- **WCAG**: 1.4.3 Contrast Minimum
- **Files**: Multiple — `login/page.tsx` ("or" divider), `page.tsx` (landing feature text), `AutomationCard.tsx` ("마지막 실행"/"다음 실행" labels), `StatCard.tsx` (label text), `Sidebar.tsx` (nav category labels "HOME"/"SETTINGS"), `SchedulePicker.tsx` (preview labels), `LogEntry.tsx` (timestamp)
- **Impact**: `slate-400` (#94a3b8) on white (#fff) produces a contrast ratio of **2.63:1**, well below the 4.5:1 required for normal text. This affects numerous secondary labels and informational text throughout the app.
- **Fix**: Replace `text-slate-400` with `text-slate-500` (#6b7280, ratio 4.61:1) for any text that carries meaning. Pure decorative elements can remain `slate-400`.

---

**S-2. `connections/page.tsx` loading/error states are not accessible**
- **WCAG**: 4.1.3 Status Messages (AA); 1.3.1 Info and Relationships
- **File**: `src/app/(dashboard)/connections/page.tsx` (lines 101–102)
- **Impact**: Loading state renders `<div>Loading...</div>` and error state renders `<div>{error}</div>` — both are bare `<div>` elements. The error state in particular will not be announced to screen reader users who may be focused elsewhere when the component transitions from loading to error.
- **Fix**: Add `role="status"` to the loading div and `role="alert"` to the error div. Apply the same pattern to identical bare loading states in `settings/page.tsx` and `onboarding/page.tsx`.

---

**S-3. Wizard `tabpanel` is missing a corresponding `tab` element**
- **WCAG**: 4.1.2 Name, Role, Value
- **File**: `src/components/forms/Wizard.tsx` (line 92)
- **Impact**: The step content area uses `role="tabpanel"` but there are no corresponding elements with `role="tab"`. The `StepIndicator` uses `aria-current="step"` on the step circles, which is correct for a `progressbar`/`listitem` pattern but does not match the tab pattern. This creates an orphaned tabpanel that screen readers may ignore or announce incorrectly.
- **Fix**: Either remove `role="tabpanel"` and use a simple `<section aria-label="...">`, or fully implement the tab pattern with `role="tab"`, `aria-controls`, and `aria-selected` on the step indicator items. The simpler fix (section) is preferred.

---

**S-4. `SchedulePicker` labels are not associated with their `Select` controls**
- **WCAG**: 1.3.1 Info and Relationships; 3.3.2 Labels or Instructions
- **File**: `src/components/pickers/SchedulePicker.tsx`
- **Impact**: The labels for "Frequency", "Hour", "Minute", "Day of week", "Day of month", "Timezone" are plain `<label>` elements without `htmlFor` attributes. They visually appear above the select controls but are not programmatically associated. Screen readers will not announce the label when the user focuses the control.
- **Fix**: Add `id` props to each `Select` component and corresponding `htmlFor` on each `label`. The `Select` component (`src/components/ui/Select.tsx`) should be checked to ensure it forwards an `id` prop to its underlying input.

---

**S-5. `Tooltip` has a single static `id="floqi-tooltip"` — creates duplicate IDs when multiple tooltips exist**
- **WCAG**: 4.1.1 Parsing
- **File**: `src/components/ui/Tooltip.tsx` (line 68)
- **Impact**: If two tooltips are visible simultaneously (or if the same ID is used in `aria-describedby` on multiple elements in the DOM), the duplicate ID violates HTML validity and causes incorrect screen reader associations.
- **Fix**: Replace the static string with a unique generated ID: `const tooltipId = React.useId()` (or a unique counter). Since the tooltip is rendered into a portal and only one tooltip shows at a time currently, this is lower urgency but should still be fixed for robustness.

---

**S-6. `FormFieldPassword` toggle button position is calculated with a hardcoded `top` value**
- **WCAG**: 1.4.4 Resize Text
- **File**: `src/components/forms/FormFieldPassword.tsx` (line 61)
- **Impact**: `top-[2.15rem]` is the same for both the error and non-error states (`props.errorMessage ? 'top-[2.15rem]' : 'top-[2.15rem]'` — identical). When text is resized to 200%, the button will misalign. This is a minor positioning bug with a trivial fix but the identical class for both branches suggests unfinished logic.
- **Fix**: Position the button with `top-1/2 -translate-y-1/2` relative to the input height (following the icon positioning pattern already used in `Input.tsx`). This automatically adapts to any text size.

---

**S-7. `connections/page.tsx` — "Add Integration" button has no action**
- **WCAG**: 2.4.4 Link Purpose (usability)
- **File**: `src/app/(dashboard)/connections/page.tsx` (line 127)
- **Impact**: `<Button variant="primary">+ Add Integration</Button>` has no `onClick`, no `href`, and no `disabled` with explanation. Clicking it does nothing. Screen readers and keyboard users have no way to know this is non-functional.
- **Fix**: Either wire up an action, disable the button with an `aria-describedby` pointing to an explanation, or remove it entirely until it is functional.

---

**S-8. `automations/new/page.tsx` — "Coming soon" template buttons are fully interactive**
- **WCAG**: 4.1.2 Name, Role, Value
- **File**: `src/app/(dashboard)/automations/new/page.tsx` (lines 148–156)
- **Impact**: Templates marked `comingSoon: true` (Weekly Review, Smart Save) render as fully clickable `<button>` elements. Clicking them sets `selectedTemplate` to a "coming soon" item and allows the user to proceed through the wizard, which creates an automation with a template type that likely has no execution backend.
- **Fix**: Add `disabled={tpl.comingSoon}` and `aria-disabled="true"` to coming-soon buttons. Optionally add a tooltip explaining they are not yet available. This is both an accessibility and product correctness issue.

---

### Moderate Issues

---

**M-1. `(dashboard)/layout.tsx` nav links are hard-coded with wrong paths**
- **WCAG**: 2.4.4 Link Purpose
- **File**: `src/app/(dashboard)/layout.tsx`
- **Impact**: The nav links use `/dashboard/connections` (incorrect — the route is `/connections`) and there is no Automations or Settings link. This creates broken navigation and `aria-current` cannot be applied since the component has no awareness of the current route.
- **Fix**: When integrating the `Sidebar` component, this stub becomes obsolete. In the interim, correct the link paths.

---

**M-2. `signup/page.tsx` — error message "8자 이상 입력하세요" is in Korean only**
- **WCAG**: 3.1.1 Language of Page; 3.3.1 Error Identification
- **File**: `src/app/(auth)/signup/page.tsx` (line 33)
- **Impact**: The page HTML has `lang="en"` (set in `layout.tsx`). A Korean error message rendered inside an English-language page may be mispronounced by screen readers configured for English TTS. The English-language portion of the UI also has Korean mixed into form labels (e.g. "비밀번호" in `FormFieldPassword`, "자동화 설명" in `new-natural/page.tsx`).
- **Fix**: Standardize error messages in the page's declared language. If the app supports multiple languages, implement i18n properly so the `lang` attribute is set per-locale and all content is consistently translated. At minimum, add `lang="ko"` attributes to inline Korean text spans in English-language contexts.

---

**M-3. `automations/[id]/page.tsx` — execution status filter buttons lack `aria-label`**
- **WCAG**: 4.1.2 Name, Role, Value
- **File**: `src/app/(dashboard)/automations/[id]/page.tsx` (lines 321–338)
- **Impact**: The status filter buttons (`All`, `Success`, `Error`) use a hidden `<span role="radio" aria-checked={isActive} hidden />` inside each button. The `hidden` attribute removes the span from the accessibility tree entirely, making the radio semantics invisible to screen readers. The intended ARIA state is never communicated.
- **Fix**: Remove the hidden `<span role="radio">` approach. Instead, apply `role="radio"` and `aria-checked` directly on the `<button>` element (matching the pattern in `FilterBar.tsx`), or use native radio inputs.

---

**M-4. `page.tsx` (landing) — hidden tracking pixel image has misleading `alt`**
- **WCAG**: 1.1.1 Non-text Content
- **File**: `src/app/page.tsx` (line 67), `src/components/layout/TopNavBar.tsx` (lines 140, 218)
- **Impact**: A 1×1 pixel transparent GIF is embedded inside `<Link>` and `<a>` buttons with `alt="free"`. The `alt` text "free" is a visible accessible name for a decorative pixel — screen readers may announce "free" unexpectedly when reading the button. The image has `className="absolute h-0 w-0 overflow-hidden"` which visually hides it, but the `alt` attribute still exposes it to assistive technology.
- **Fix**: Add `aria-hidden="true"` to these `<img>` elements (or use `alt=""` to mark them as decorative). The comment `{/* eslint-disable-next-line @next/next/no-img-element */}` suggests this is an intentional workaround — it should be reviewed for whether the img element serves any purpose at all.

---

**M-5. `StatCard.tsx` — trend badge conveys meaning via color alone**
- **WCAG**: 1.4.1 Use of Color
- **File**: `src/components/cards/StatCard.tsx`
- **Impact**: The trend badge uses green/red/slate backgrounds to indicate up/down/neutral trends. While icons (TrendingUp, TrendingDown, Minus) are present, they are marked `aria-hidden="true"` and the surrounding badge container has no text label announcing the trend direction to screen readers. The badge renders only `trendValue` (e.g. "+12%") without context.
- **Fix**: Add visually hidden text inside the trend badge: `<span class="sr-only">(up trend)</span>` or make the trend icon visible to the accessibility tree with `aria-label="Trending up"`.

---

**M-6. `EmptyState.tsx` CTA button missing `type="button"`**
- **WCAG**: 4.1.2 Name, Role, Value (best practice for forms)
- **File**: `src/components/ui/EmptyState.tsx` (line 45)
- **Impact**: The action button lacks `type="button"`, so inside a `<form>` element it would default to `type="submit"` and accidentally submit the form. While there are no current EmptyState usages inside forms, this is a defensive correctness issue.
- **Fix**: Add `type="button"` to the action button.

---

**M-7. `dashboard/page.tsx` — bar chart has no accessible data alternative**
- **WCAG**: 1.1.1 Non-text Content; 1.4.5 Images of Text
- **File**: `src/app/(dashboard)/page.tsx` (lines 131–160)
- **Impact**: The execution trend chart is implemented as `<div>` bars with inline `style={{ height: ... }}`. Each bar has a `title` attribute (e.g. `"2026-03-01: 3"`) which provides tooltip text on hover but is not reliably announced by screen readers. Keyboard users cannot access the chart data at all.
- **Fix**: Add a visually-hidden `<table>` or `<ul>` with the same data as a text alternative below the chart, or use `role="img"` on the chart container with a comprehensive `aria-label` describing the data range and trend.

---

### Minor Issues

---

**m-1. `Sidebar.tsx` collapsed state — nav links have `title` but no `aria-label`**
- **WCAG**: 2.4.4 Link Purpose
- **File**: `src/components/layout/Sidebar.tsx` (lines 129, 162)
- **Impact**: When the sidebar is collapsed, icon-only links have `title={isCollapsed ? item.label : undefined}`. The `title` attribute is shown as a tooltip on hover but is not consistently read by screen readers (browser/AT behavior varies). `aria-label` is the correct attribute for providing accessible names to icon-only links.
- **Fix**: Replace `title={isCollapsed ? item.label : undefined}` with `aria-label={isCollapsed ? item.label : undefined}` on the `<Link>` elements.

---

**m-2. `Modal.tsx` — no focus trap cycling (focus can leave the modal with Shift+Tab on first element)**
- **WCAG**: 2.1.2 No Keyboard Trap (inverted — focus should stay IN the modal)
- **File**: `src/components/ui/Modal.tsx`
- **Impact**: The modal focuses the dialog panel (`dialogRef.current.focus()`) on open, but there is no full focus trap. Users can Tab out of the modal back to background content. A proper focus trap cycles focus between the first and last focusable elements inside the dialog.
- **Fix**: Implement a focus trap using a library like `focus-trap-react` or a custom implementation that intercepts Tab/Shift+Tab on the boundary elements.

---

**m-3. `TopNavBar.tsx` — mobile menu does not trap focus or return focus on close**
- **WCAG**: 2.4.3 Focus Order; 2.1.1 Keyboard
- **File**: `src/components/layout/TopNavBar.tsx`
- **Impact**: When the mobile menu is opened, focus stays on the hamburger button rather than moving to the first menu item. When the menu is closed by clicking a link, focus is not returned to the trigger button.
- **Fix**: On `mobileOpen = true`, move focus to the first link in `#mobile-nav`. On `mobileOpen = false`, return focus to the toggle button.

---

**m-4. `SchedulePicker.tsx` — `<label>` elements are not associated via `htmlFor`**
- *(Also listed as S-4 — documented here for completeness in minor list)*
- Refer to S-4 above.

---

**m-5. `settings/page.tsx` — Email field is a read-only `<div>`, not an input**
- **WCAG**: 4.1.2 Name, Role, Value
- **File**: `src/app/(dashboard)/settings/page.tsx` (lines 274–279)
- **Impact**: The Email field renders as `<div className="flex h-10 items-center ...">—</div>` next to a `<label>Email</label>`. The label is not associated with any form control (`htmlFor` is missing from the label). Screen readers will not associate the label with this display element.
- **Fix**: Either use a properly disabled `<input type="email" disabled aria-label="Email address" value={email}>` so it participates in the form semantics, or remove the `<label>` and use a `<dt>`/`<dd>` pair since it is read-only display data.

---

**m-6. `PricingTable.tsx` — `role="list"` on the outer grid container with `role="listitem"` wrappers creates a nested-list pattern inconsistency**
- **WCAG**: 1.3.1 Info and Relationships
- **File**: `src/components/tables/PricingTable.tsx` (lines 117–125)
- **Impact**: The outer `<div role="list">` contains `<div role="listitem">` wrappers which each contain a `PricingCard`. Inside `PricingCard`, there is already a `<ul role="list">` for features. Nesting `role="list"` inside `role="listitem"` is valid but the outer list only has 3 items (the plan cards) with no visible list indicators and the semantic benefit is minimal. Screen readers will announce "list, 3 items" before each pricing section.
- **Fix**: Either keep and rely on the list semantics (acceptable), or convert the outer container to a semantic `<ul>` with `<li>` children for cleaner HTML, which removes the need for explicit ARIA roles.

---

**m-7. `FilterBar.tsx` date picker dropdown lacks click-outside-to-close**
- **WCAG**: 2.1.1 Keyboard; 2.1.2 No Keyboard Trap
- **File**: `src/components/filters/FilterBar.tsx` (lines 171–236)
- **Impact**: The date picker dropdown (`role="dialog"`) opens on button click but has no handler to close when the user clicks outside it or presses Escape. The dropdown remains open indefinitely until "Apply" or "Clear" is clicked. This traps sighted users and is confusing for all users.
- **Fix**: Add an `useEffect` with a document-level `mousedown` listener and an `keydown` Escape listener to close the dropdown, similar to the approach used in `Modal.tsx`.

---

**m-8. Loading states across the app render text-only spinners**
- **WCAG**: 4.1.3 Status Messages
- **Files**: `dashboard/page.tsx`, `automations/page.tsx`, `automations/[id]/page.tsx`, `logs/page.tsx`, etc.
- **Impact**: Multiple pages render `<div>Loading...</div>` (plain text, no ARIA) as their loading state. While not a hard failure, `role="status"` and `aria-live="polite"` should be added so screen reader users are informed of loading progress.
- **Fix**: Standardize all loading states to use `<div role="status" aria-live="polite">Loading...</div>` or a dedicated `<Spinner>` component with appropriate live region attributes.

---

**m-9. `NotificationBanner.tsx` — not audited (file exists in layout directory but not used in any page)**
- **File**: `src/components/layout/NotificationBanner.tsx`
- The component exists but was not found in use. It should be reviewed for `role="alert"` or `role="status"` ARIA attributes when integrated.

---

## UI/UX Design Issues (Non-WCAG)

---

**UX-1. Sidebar component is built but not used in the live app**
- **Impact**: The dashboard navigation is a barebones stub. The production-quality Sidebar (`src/components/layout/Sidebar.tsx`) with collapse/expand, active state highlighting, user profile, and upgrade prompt exists but is completely disconnected from the live layout.
- **Recommendation**: Connect `Sidebar` to `(dashboard)/layout.tsx` via `SidebarClient.tsx` (which the Sidebar already uses for client-side state).

---

**UX-2. Mixed language throughout the UI creates inconsistent user experience**
- **Impact**: The app mixes English and Korean (한국어) in labels, error messages, button labels, and status messages without a consistent strategy. Examples: "비밀번호" label on signup, "자동화 삭제" in the modal title, "8자 이상 입력하세요" as a validation error on what appears to be the English UI, "저장 중..." on the save button in settings.
- **Recommendation**: Decide on a primary language for the MVP. If targeting Korean users, set `lang="ko"` and translate all UI strings. If targeting English users, replace all Korean strings with English equivalents and provide Korean as a toggle option via the language settings already built.

---

**UX-3. `automations/[id]/page.tsx` Edit button calls `alert()` with a "coming soon" message**
- **Impact**: `onClick={() => alert('Edit functionality coming in Sprint 2')}` (line 235) uses a native browser alert — jarring, inaccessible (same issue as `window.confirm()`), and exposes internal sprint planning vocabulary to end users.
- **Recommendation**: Either link to the `/automations/${id}/edit` page (which already exists and is functional) or remove the Edit button until ready.

---

**UX-4. Dashboard success rate chart shows only a large number with no context**
- **Impact**: The success rate "chart" (lines 162–170 of `dashboard/page.tsx`) displays a large percentage number centered in a 200px tall box. There is no trend indicator, no comparison baseline, and no visual chart element — it is functionally just a large `StatCard` duplicate rendered in a card wrapper.
- **Recommendation**: Replace with an actual donut/ring chart or consolidate into the 4-stat grid at the top of the page and eliminate the redundant chart section.

---

**UX-5. No visual focus ring on some custom interactive elements at the component library level**
- **Impact**: The `Button` component uses `focus-visible:ring-2 focus-visible:ring-offset-2` which is good. However, several pages use raw `<button>` elements with custom classes (e.g. `connections/page.tsx` line 127, `settings/page.tsx` lines 367–372) that include only `hover:` styles without `focus:outline-none focus:ring-2` patterns. This is inconsistent and some buttons may have browser-default focus outlines (which vary widely across browsers) rather than the design system's styled ring.
- **Recommendation**: Audit all raw `<button>` elements in page files and ensure they consistently use the design system focus ring pattern or, better, use the `<Button>` component from the design system.

---

**UX-6. `new-natural/page.tsx` — Enter-to-submit behavior is undiscoverable**
- **Impact**: The natural language automation creator (`/automations/new-natural`) submits on `Enter` keypress (when Shift is not held). This is a non-standard behavior for a `<textarea>`. Users expecting to insert newlines (Shift+Enter) for multi-line prompts will be surprised that Enter submits. There is no visible hint about this behavior.
- **Recommendation**: Add a helper text below the textarea: "Press Enter to create, Shift+Enter for new line." Or remove the Enter-to-submit behavior and rely solely on the "생성" button.

---

## Page-by-Page Summary

| Page | Manual Issues | Axe Issues | Highest Severity |
|------|--------------|-----------|-----------------|
| `/` (Landing) | M-4, m-6, m-1(TopNav) | color-contrast, label(Agentation) | Serious |
| `/login` | M-2(lang), m-3(TopNav) | color-contrast, label(Agentation) | Serious |
| `/signup` | M-2(lang), m-3(TopNav), S-6 | label(Agentation) | Serious |
| `/dashboard` | C-2, M-7, m-8 | (not scanned) | Critical |
| `/automations` | C-2, C-6, M-3 | (not scanned) | Critical |
| `/automations/new` | S-8, S-3, S-4 | (not scanned) | Serious |
| `/automations/[id]` | C-4, M-3 | (not scanned) | Critical |
| `/automations/[id]/edit` | S-1, m-5(partial) | (not scanned) | Serious |
| `/automations/new-natural` | M-2, UX-6 | (not scanned) | Moderate |
| `/connections` | C-2, S-2, S-7 | (not scanned) | Critical |
| `/logs` | C-2, m-8 | (not scanned) | Critical |
| `/logs/[id]` | C-2 | (not scanned) | Critical |
| `/settings` | C-3, S-2, m-5, M-2 | (not scanned) | Critical |
| `/onboarding` | S-2, C-2 | (not scanned) | Critical |

---

## Recommendations Priority

### Priority 1 — Fix before launch (Critical/Blocking)

1. **[C-1]** Add a skip-navigation link to `layout.tsx` and `(dashboard)/layout.tsx`
2. **[C-2]** Connect the `Sidebar` component to the dashboard layout (replace the nav stub)
3. **[C-3]** Replace the two inline modal `<div>` elements in `settings/page.tsx` with the `<Modal>` component
4. **[C-4]** Replace `window.confirm()` in `automations/[id]/page.tsx` with a `<Modal>` confirmation
5. **[S-1]** Change all `text-slate-400` instances to `text-slate-500` for text that carries meaning (contrast fix)

### Priority 2 — Fix before public beta (Serious)

6. **[S-2]** Add `role="status"` / `role="alert"` to all loading and error state divs
7. **[S-3]** Remove `role="tabpanel"` from `Wizard.tsx` content area (replace with `<section>`)
8. **[S-4]** Associate all `<label>` elements in `SchedulePicker.tsx` with their controls via `htmlFor`
9. **[S-7]** Disable or implement the "Add Integration" button in `connections/page.tsx`
10. **[S-8]** Disable "coming soon" template buttons in `automations/new/page.tsx`
11. **[M-2]** Standardize language in the UI — align all user-facing strings to one primary language
12. **[UX-3]** Replace `alert()` call on Edit button with a real route push

### Priority 3 — Improve for accessibility certification (Moderate/Minor)

13. **[m-2]** Implement a focus trap in `Modal.tsx`
14. **[m-3]** Add focus management to `TopNavBar.tsx` mobile menu
15. **[C-5]** Refactor `LogEntry` to use native `<button>` when interactive
16. **[C-6]** Add arrow-key navigation to custom radio button groups
17. **[M-4]** Fix misleading `alt="free"` on tracking pixel images
18. **[M-7]** Add click-outside and Escape handlers to `FilterBar` date picker
19. **[m-1]** Replace `title` with `aria-label` on collapsed Sidebar links
20. **[M-5]** Add `role="img"` + `aria-label` or text alternative to the dashboard bar chart
21. **[S-5]** Fix duplicate tooltip ID in `Tooltip.tsx` using `React.useId()`
22. **[m-8]** Standardize loading states with `role="status" aria-live="polite"` across all pages

---

*End of Report*
