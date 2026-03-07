# Design Reference Image Renames

**Folder**: `Automation Workflow Dashboard UI KIT (Community)`
**Date**: 2026-03-05
**Total files renamed**: 36 (27 Screenshots + 9 reference-XX files)

Pre-existing files kept as-is: `kit3-02-status-badges.png`, `kit3-04-workflow-detail.png`

---

## Old → New Mapping

### Screenshots (Desktop views)

| Old Name | New Name | Description |
|----------|----------|-------------|
| Screenshot 2026-03-05 at 9.02.31 PM.png | kit3-03-workflow-builder-db-panel.png | Workflow builder canvas with "Connect to database" side panel open (desktop) |
| Screenshot 2026-03-05 at 9.02.43 PM.png | kit3-05-integrations-page.png | Integrations page showing all available service cards in a grid (desktop) |
| Screenshot 2026-03-05 at 9.02.51 PM.png | kit3-06-log-activity-page.png | Log Activity page with Success/Failed workflow execution rows and pagination (desktop) |
| Screenshot 2026-03-05 at 9.03.04 PM.png | kit3-07-team-access-page.png | Team Access page with member list, roles, and invitation status (desktop) |
| Screenshot 2026-03-05 at 9.03.19 PM.png | kit3-08-profile-settings-page.png | Profile settings page with data profile, language/region, and danger zone sections (desktop) |

### Screenshots (Auth pages — split layout with transparent right panel)

| Old Name | New Name | Description |
|----------|----------|-------------|
| Screenshot 2026-03-05 at 9.03.42 PM.png | kit3-09-login-form-desktop.png | Login form with email/password fields, Remember me, OAuth buttons (desktop split layout) |
| Screenshot 2026-03-05 at 9.03.46 PM.png | kit3-10-signup-form-desktop.png | Sign up form with name/email/password fields and OAuth buttons (desktop split layout) |
| Screenshot 2026-03-05 at 9.03.52 PM.png | kit3-11-forgot-password-form-desktop.png | Forgot Password form with email field and Reset password button (desktop split layout) |

### Screenshots (Auth pages — Mobile)

| Old Name | New Name | Description |
|----------|----------|-------------|
| Screenshot 2026-03-05 at 9.04.06 PM.png | kit3-12-login-form-mobile-empty.png | Login form empty/default state (mobile) |
| Screenshot 2026-03-05 at 9.04.09 PM.png | kit3-13-login-form-mobile-filled.png | Login form with credentials filled and Remember me checked (mobile) |
| Screenshot 2026-03-05 at 9.04.14 PM.png | kit3-14-login-form-mobile-error.png | Login form with validation error banner — incorrect credentials (mobile) |
| Screenshot 2026-03-05 at 9.04.18 PM.png | kit3-15-signup-form-mobile-empty.png | Signup form empty/default state (mobile) |
| Screenshot 2026-03-05 at 9.04.22 PM.png | kit3-16-signup-form-mobile-filled.png | Signup form with name/email/password filled (mobile) |
| Screenshot 2026-03-05 at 9.04.26 PM.png | kit3-17-signup-form-mobile-error.png | Signup form with validation error — fields highlighted in red (mobile) |

### Screenshots (Dashboard — Mobile)

| Old Name | New Name | Description |
|----------|----------|-------------|
| Screenshot 2026-03-05 at 9.04.49 PM.png | kit3-18-dashboard-mobile-full.png | Dashboard full scroll: KPI stats, activity trend chart, execution health donut, integration status, recent workflows (mobile) |
| Screenshot 2026-03-05 at 9.04.53 PM.png | kit3-19-dashboard-mobile-top.png | Dashboard top section showing KPI stat cards only (mobile) |
| Screenshot 2026-03-05 at 9.04.57 PM.png | kit3-20-nav-drawer-mobile.png | Navigation drawer open with full menu items and upgrade plan card (mobile) |
| Screenshot 2026-03-05 at 9.05.01 PM.png | kit3-21-dashboard-mobile-ai-closed.png | Dashboard with AI assistant button visible but chatbot closed (mobile) |
| Screenshot 2026-03-05 at 9.05.02 PM.png | kit3-22-dashboard-mobile-ai-open.png | Dashboard with AI assistant panel open at bottom (mobile) |

### Screenshots (Other pages — Mobile)

| Old Name | New Name | Description |
|----------|----------|-------------|
| Screenshot 2026-03-05 at 9.05.12 PM.png | kit3-23-automations-mobile-create.png | Automations page showing "What would you like to automate?" with Zap/Table/Interface options and recent workflows list (mobile) |
| Screenshot 2026-03-05 at 9.05.16 PM.png | kit3-24-workflow-builder-mobile-empty.png | Workflow builder canvas in empty/blank state with bottom toolbar (mobile) |
| Screenshot 2026-03-05 at 9.05.21 PM.png | kit3-25-integrations-mobile-full.png | Integrations page with Slack, Teams, Notion, Gmail cards and toggles — full view (mobile) |
| Screenshot 2026-03-05 at 9.05.24 PM.png | kit3-26-integrations-mobile-partial.png | Integrations page — partial scroll showing top services only (mobile) |
| Screenshot 2026-03-05 at 9.05.31 PM.png | kit3-27-log-activity-mobile.png | Log Activity list with Success/Failed status badges and workflow names (mobile) |
| Screenshot 2026-03-05 at 9.05.36 PM.png | kit3-28-team-access-mobile.png | Team Access member list with roles and invitation status (mobile) |
| Screenshot 2026-03-05 at 9.05.41 PM.png | kit3-29-pricing-page-mobile.png | Pricing page with Starter/Pro/Enterprise tiers, monthly/yearly toggle (mobile) |
| Screenshot 2026-03-05 at 9.05.47 PM.png | kit3-30-profile-settings-mobile.png | Profile settings with data profile, language/region, and danger zone (mobile) |

---

### Reference files (Component documentation / design specs)

| Old Name | New Name | Description |
|----------|----------|-------------|
| reference-08.png | kit3-01-dashboard-overview.png | Full desktop dashboard overview — KPI cards, activity chart, execution health, integration status, recent workflows (desktop) |
| reference-09.png | kit3-38-automations-list-page.png | Automations list page with workflow rows, app icons, status toggles, and pagination (desktop) |
| reference-01.png | kit3-31-integration-card-and-log-row-variants.png | Component spec: integration service card (on/off toggle states) and log activity row variants (desktop + mobile) |
| reference-02.png | kit3-32-team-member-row-variants.png | Component spec: team member list row variants — owner, admin, invitation pending states |
| reference-03.png | kit3-33-file-upload-dropzone-component.png | Component spec: file upload drag-and-drop zone with "Browse File" button and format hint |
| reference-04.png | kit3-34-mobile-nav-drawer-component.png | Component spec: mobile navigation drawer in open/collapsed states with upgrade plan card |
| reference-05.png | kit3-35-sidebar-menu-item-variants.png | Component spec: sidebar menu item variants — default, toggle, selected, active, with badge states |
| reference-06.png | kit3-36-sidebar-nav-expanded-collapsed.png | Component spec: desktop sidebar navigation in expanded (full labels) and collapsed (icons only) states |
| reference-07.png | kit3-37-notification-card-variants.png | Component spec: notification card — unread (dot indicator) and read states |

---

## Final File List (38 files)

```
kit3-01-dashboard-overview.png               (was reference-08.png)
kit3-02-status-badges.png                    (pre-existing, unchanged)
kit3-03-workflow-builder-db-panel.png        (was Screenshot 9.02.31 PM)
kit3-04-workflow-detail.png                  (pre-existing, unchanged)
kit3-05-integrations-page.png                (was Screenshot 9.02.43 PM)
kit3-06-log-activity-page.png                (was Screenshot 9.02.51 PM)
kit3-07-team-access-page.png                 (was Screenshot 9.03.04 PM)
kit3-08-profile-settings-page.png            (was Screenshot 9.03.19 PM)
kit3-09-login-form-desktop.png               (was Screenshot 9.03.42 PM)
kit3-10-signup-form-desktop.png              (was Screenshot 9.03.46 PM)
kit3-11-forgot-password-form-desktop.png     (was Screenshot 9.03.52 PM)
kit3-12-login-form-mobile-empty.png          (was Screenshot 9.04.06 PM)
kit3-13-login-form-mobile-filled.png         (was Screenshot 9.04.09 PM)
kit3-14-login-form-mobile-error.png          (was Screenshot 9.04.14 PM)
kit3-15-signup-form-mobile-empty.png         (was Screenshot 9.04.18 PM)
kit3-16-signup-form-mobile-filled.png        (was Screenshot 9.04.22 PM)
kit3-17-signup-form-mobile-error.png         (was Screenshot 9.04.26 PM)
kit3-18-dashboard-mobile-full.png            (was Screenshot 9.04.49 PM)
kit3-19-dashboard-mobile-top.png             (was Screenshot 9.04.53 PM)
kit3-20-nav-drawer-mobile.png                (was Screenshot 9.04.57 PM)
kit3-21-dashboard-mobile-ai-closed.png       (was Screenshot 9.05.01 PM)
kit3-22-dashboard-mobile-ai-open.png         (was Screenshot 9.05.02 PM)
kit3-23-automations-mobile-create.png        (was Screenshot 9.05.12 PM)
kit3-24-workflow-builder-mobile-empty.png    (was Screenshot 9.05.16 PM)
kit3-25-integrations-mobile-full.png         (was Screenshot 9.05.21 PM)
kit3-26-integrations-mobile-partial.png      (was Screenshot 9.05.24 PM)
kit3-27-log-activity-mobile.png              (was Screenshot 9.05.31 PM)
kit3-28-team-access-mobile.png               (was Screenshot 9.05.36 PM)
kit3-29-pricing-page-mobile.png              (was Screenshot 9.05.41 PM)
kit3-30-profile-settings-mobile.png          (was Screenshot 9.05.47 PM)
kit3-31-integration-card-and-log-row-variants.png  (was reference-01.png)
kit3-32-team-member-row-variants.png         (was reference-02.png)
kit3-33-file-upload-dropzone-component.png   (was reference-03.png)
kit3-34-mobile-nav-drawer-component.png      (was reference-04.png)
kit3-35-sidebar-menu-item-variants.png       (was reference-05.png)
kit3-36-sidebar-nav-expanded-collapsed.png   (was reference-06.png)
kit3-37-notification-card-variants.png       (was reference-07.png)
kit3-38-automations-list-page.png            (was reference-09.png)
```
