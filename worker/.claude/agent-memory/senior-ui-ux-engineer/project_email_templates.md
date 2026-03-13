---
name: floqi_email_template_conventions
description: HTML email template design conventions and placeholder syntax used in Floqi's prompt.go
type: project
---

## File Location
`worker/internal/agent/prompt.go` — `BuildSystemPrompt` function, switch-case per template type.

## Brand Colors
- Primary blue: #4a90d9
- Accent purple: #7b68ee
- Success green: #34c77b
- Warning amber: #f5a623
- Error red: #e74c3c
- Background: #eef2f7
- Card background: #f5f8fd

## 4 Email Templates Implemented (2026-03-12)

| Template | Header Gradient | Accent | Purpose |
|----------|----------------|--------|---------|
| morning_briefing | #4a90d9 → #7b68ee | blue/purple/green per card | Weather + Calendar + Emails |
| reading_digest | #1a1f36 → #2d3561 | dynamic per category | News articles by category |
| email_triage | #1e293b → #334155 | red/amber/green by priority | Urgent/Important/Reference |
| weekly_review | #0f4c81 → #4a90d9 | blue/purple/green/amber | Stats + Highlights + Follow-ups |

## HTML Email Constraints (Critical)
- All CSS must be INLINE — no `<style>` blocks
- Use `<table>` layout for Outlook compatibility
- `background-color` not `background` shorthand
- Max width 600px, safe fonts: Arial, Helvetica, sans-serif
- No JavaScript, no external CSS

## Placeholder Syntax
- Single values: `{{PLACEHOLDER_NAME}}`
- Loops: `{{FOR_EACH_X}}...{{END_FOR_EACH}}`
- Conditionals: `{{IF_HAS_X}}...{{END_IF_HAS_X}}`

## Card Pattern (Shared Across All Templates)
Each section uses a left-border accent card:
```html
<table width="100%" style="background-color:#f5f8fd;border-radius:8px;overflow:hidden;">
  <tr><td style="border-left:4px solid {{ACCENT_COLOR}};padding:16px 18px;">
    <p style="font-size:13px;font-weight:700;color:{{ACCENT_COLOR}};text-transform:uppercase;letter-spacing:1px;">SECTION LABEL</p>
    <!-- content -->
  </td></tr>
</table>
```

## Footer Pattern (Shared)
```html
<tr><td style="padding:16px 28px 24px;text-align:center;border-top:1px solid #eef2f7;">
  <p style="font-size:12px;color:#b0b9c6;">Floqi AI가 자동으로 생성한 [TYPE]입니다.</p>
</td></tr>
```

## All text is Korean (한국어) — the user's preferred language.
