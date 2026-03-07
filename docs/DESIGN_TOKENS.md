# Floqi Design Tokens

> Source: `docs/design-tokens.json`
> Extracted from: AI SaaS Dashboard UI Kit design references

---

## Overview

Design tokens are the single source of truth for all visual decisions in Floqi. Every color, typography size, spacing value, and shadow is defined here and should be consumed via Tailwind config or CSS variables — never hardcoded.

---

## Colors

### Slate (Neutral / Gray)

The primary neutral palette used for text, borders, and backgrounds.

| Token | Hex | Usage |
|-------|-----|-------|
| `slate.50` | `#f8fafc` | Page background |
| `slate.100` | `#f1f5f9` | Subtle backgrounds, secondary button bg |
| `slate.200` | `#e2e8f0` | Borders, dividers |
| `slate.300` | `#cbd5e1` | Disabled borders |
| `slate.400` | `#94a3b8` | Placeholder text, muted icons |
| `slate.500` | `#64748b` | Secondary text |
| `slate.600` | `#475569` | Body text |
| `slate.700` | `#334155` | Dark body text |
| `slate.800` | `#1e293b` | Dark backgrounds (toast success) |
| `slate.900` | `#0f172a` | Primary text, headings |
| `slate.950` | `#020617` | Darkest — rarely used |

### Primary (Blue)

Used for interactive elements: buttons, links, focus rings, active states.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary.50` | `#eff6ff` | Hover backgrounds, active sidebar bg |
| `primary.100` | `#dbeafe` | Light tints, badges |
| `primary.200` | `#bfdbfe` | Disabled button text, focus outline |
| `primary.300` | `#93c5fd` | Light interactive elements |
| `primary.400` | `#60a5fa` | Secondary actions |
| `primary.500` | `#3b82f6` | Processing badge dot |
| `primary.600` | `#2563eb` | **Primary brand color** — main CTAs |
| `primary.700` | `#1d4ed8` | Hover state for primary buttons |
| `primary.800` | `#1e40af` | Active/pressed state |
| `primary.900` | `#1e3a8a` | Very dark blue |
| `primary.950` | `#172554` | Darkest blue |

### Semantic Colors

#### Success (Green)
| Token | Hex | Usage |
|-------|-----|-------|
| `green.50` | `#f0fdf4` | Success badge background |
| `green.100` | `#dcfce7` | Success tint |
| `green.500` | `#22c55e` | Success icon/dot |
| `green.600` | `#16a34a` | Success text |
| `green.700` | `#15803d` | Dark success |

#### Warning (Amber)
| Token | Hex | Usage |
|-------|-----|-------|
| `amber.50` | `#fffbeb` | Warning badge background |
| `amber.100` | `#fef3c7` | Warning tint |
| `amber.500` | `#f59e0b` | Warning icon/dot |
| `amber.600` | `#d97706` | Warning text |
| `amber.700` | `#b45309` | Dark warning text |

#### Error (Red)
| Token | Hex | Usage |
|-------|-----|-------|
| `red.50` | `#fef2f2` | Error badge background, error toast bg |
| `red.100` | `#fee2e2` | Error tint |
| `red.500` | `#ef4444` | Error icon, error border |
| `red.600` | `#dc2626` | Error text, danger button |
| `red.700` | `#b91c1c` | Dark error |

---

## Typography

### Font Families

```
Primary: Inter, Pretendard, system-ui, -apple-system, sans-serif
Mono:    JetBrains Mono, Fira Code, Consolas, monospace
```

### Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `display-h1` | 48px | 56px | 700 (Bold) | Hero headlines, page titles |
| `h2` | 36px | 44px | 700 (Bold) | Section titles |
| `h3` | 28px | 36px | 600 (SemiBold) | Card headings, subsections |
| `h4` | 22px | 30px | 600 (SemiBold) | Sub-headings |
| `h5` | 18px | 26px | 500 (Medium) | Component labels, tab labels |
| `h6` | 15px | 22px | 500 (Medium) | Small section headers |
| `body-large` | 16px | 24px | 400 (Regular) | Lead body text, descriptions |
| `body` | 14px | 20px | 400 (Regular) | Default body text |
| `body-small` | 13px | 18px | 400 (Regular) | Secondary body text |
| `caption` | 11px | 16px | 400 (Regular) | Metadata, timestamps, labels |
| `overline` | 11px | 16px | 600 (SemiBold) | TABLE HEADERS, SECTION LABELS (uppercase) |

### Font Weights

| Name | Value |
|------|-------|
| Regular | 400 |
| Medium | 500 |
| SemiBold | 600 |
| Bold | 700 |

---

## Spacing

Base unit: **4px**. All spacing values are multiples of 4px.

| Token | Value | Tailwind Equivalent |
|-------|-------|---------------------|
| `spacing.0` | 0px | `p-0`, `m-0` |
| `spacing.1` | 4px | `p-1`, `gap-1` |
| `spacing.2` | 8px | `p-2`, `gap-2` |
| `spacing.3` | 12px | `p-3`, `gap-3` |
| `spacing.4` | 16px | `p-4`, `gap-4` |
| `spacing.5` | 20px | `p-5`, `gap-5` |
| `spacing.6` | 24px | `p-6`, `gap-6` |
| `spacing.8` | 32px | `p-8`, `gap-8` |
| `spacing.10` | 40px | `p-10`, `gap-10` |
| `spacing.12` | 48px | `p-12`, `gap-12` |
| `spacing.16` | 64px | `p-16`, `gap-16` |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `borderRadius.none` | 0px | Sharp edges |
| `borderRadius.sm` | 4px | Small elements (checkboxes, chips) |
| `borderRadius.md` | 6px | Buttons |
| `borderRadius.lg` | 8px | Inputs |
| `borderRadius.xl` | 12px | Cards, modals, toasts |
| `borderRadius.2xl` | 16px | Large cards |
| `borderRadius.3xl` | 24px | Hero sections |
| `borderRadius.full` | 9999px | Pills, badges, avatars |

---

## Box Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `boxShadow.xs` | `0 1px 2px 0 rgba(0,0,0,0.04)` | Subtle lift |
| `boxShadow.sm` | `0 1px 3px 0 rgba(0,0,0,0.08)...` | Default card |
| `boxShadow.card` | `0 1px 3px 0 rgba(0,0,0,0.06)...` | Stat cards, content cards |
| `boxShadow.md` | `0 4px 6px -1px rgba(0,0,0,0.08)...` | Floating elements |
| `boxShadow.dropdown` | `0 8px 20px -4px rgba(0,0,0,0.10)...` | Dropdowns, popovers |
| `boxShadow.lg` | `0 10px 15px -3px rgba(0,0,0,0.08)...` | Elevated panels |
| `boxShadow.modal` | `0 20px 60px -10px rgba(0,0,0,0.15)...` | Modal dialogs |
| `boxShadow.xl` | `0 20px 25px -5px rgba(0,0,0,0.08)...` | Heavy elevation |

---

## Component Tokens

### Button

```
Height:  sm=32px  md=40px  lg=48px
Padding: sm=0 12px  md=0 16px  lg=0 20px
Border Radius: 6px
```

| Variant | Background | Text | Usage |
|---------|-----------|------|-------|
| `primary` | `#2563eb` | `#ffffff` | Main CTAs |
| `secondary` | `#f1f5f9` | `#334155` | Secondary actions |
| `outline` | transparent | `#2563eb` | Tertiary actions |
| `ghost` | transparent | `#334155` | Minimal actions |
| `danger` | `#ef4444` | `#ffffff` | Destructive actions |

### Input

```
Height: 40px
Padding: 0 12px
Border Radius: 8px
Font Size: 14px
```

| State | Border | Notes |
|-------|--------|-------|
| Default | `#e2e8f0` | Placeholder: `#94a3b8` |
| Focused | `#2563eb` | Outline: `2px solid #bfdbfe` |
| Error | `#ef4444` | Outline: `2px solid #fecaca` |
| Disabled | `#e2e8f0` | Background: `#f8fafc` |

### Badge / Tag

```
Height: 24px
Padding: 0 8px
Border Radius: 9999px (pill)
Font Size: 12px
Font Weight: 500
```

| Variant | Background | Text |
|---------|-----------|------|
| `active` | `#f0fdf4` | `#16a34a` |
| `error` | `#fef2f2` | `#dc2626` |
| `warning` | `#fffbeb` | `#b45309` |
| `processing` | `#eff6ff` | `#2563eb` |
| `inactive` | `#f8fafc` | `#64748b` |
| `pro` | `#0f172a` | `#ffffff` |
| `critical` | `#ef4444` | `#ffffff` |

### Card

```
Background: #ffffff
Border: #e2e8f0 (1px solid)
Border Radius: 12px
Padding: 20px
Shadow: boxShadow.card
```

### Sidebar

```
Width: 240px
Background: #ffffff
Border Right: #e2e8f0

Active Item:
  Background: #eff6ff
  Text: #2563eb
  Left Border: 3px solid #2563eb
  Font Weight: 600

Inactive Item:
  Text: #475569
  Hover Background: #f1f5f9
```

---

## Mapping to Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',   // DEFAULT
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        slate: {
          50: '#f8fafc',
          // ... full scale
        },
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '56px', fontWeight: '700' }],
        'h2': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'h3': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'h4': ['22px', { lineHeight: '30px', fontWeight: '600' }],
        'h5': ['18px', { lineHeight: '26px', fontWeight: '500' }],
        'h6': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body': ['14px', { lineHeight: '20px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        'caption': ['11px', { lineHeight: '16px' }],
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'dropdown': '0 8px 20px -4px rgba(0, 0, 0, 0.10), 0 4px 8px -4px rgba(0, 0, 0, 0.06)',
        'modal': '0 20px 60px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.08)',
      },
    },
  },
}
```

---

## Usage Examples

### Primary Button

```tsx
<button className="h-10 px-4 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-body font-medium transition-colors">
  Confirm
</button>
```

### Card Component

```tsx
<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
  {/* content */}
</div>
```

### Badge — Active Status

```tsx
<span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-green-50 text-green-600 text-[12px] font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
  Active
</span>
```

### Input — Default + Error State

```tsx
{/* Default */}
<input className="h-10 px-3 w-full rounded-lg border border-slate-200 text-body text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-200" />

{/* Error */}
<input className="h-10 px-3 w-full rounded-lg border border-red-500 text-body text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-200" />
```

### Typography

```tsx
<h1 className="text-[48px] leading-[56px] font-bold text-slate-900">
  AI Dashboard Platform
</h1>

<p className="text-body text-slate-600 leading-5">
  Configure your AI models in one unified place.
</p>

<span className="text-caption text-slate-400">
  Last updated 2 minutes ago
</span>
```

---

## Notes

- All colors extracted directly from `kit1-01-color-palette.png` and `kit1-13-color-token.png`
- Typography scale extracted from `kit1-02-typography.png`
- Component tokens (button, input, badge) extracted from `kit1-03-buttons.png`, `kit1-04-inputs.png`, `kit1-05-badges-tags.png`
- Card and modal values extracted from `kit1-06-cards.png`, `kit1-07-modals.png`
- Toast variants extracted from `kit1-11-toasts.png`
- Sidebar tokens extracted from `kit1-12-sidebar.png`
