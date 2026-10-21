---
name: house-style
description: The Personal Assistant house style (teal on cool blue-grey, white cards, Inter, friendly sentence-case copy), drawn from mijnxtra.be. Use for ANY user-facing work in apps/mobile or packages/ui - a new screen, component, list, card, form, empty state, icon, color, spacing or piece of UI copy - and when reviewing UI changes. Covers the tokens in @pa/ui, which component to use for what, copy tone, and a checklist before calling UI work done.
---

# House style

The app looks and reads like a calm, friendly retail app: light grey-blue
pages, white cards with a soft navy shadow, dark navy text, one teal accent
for actions. It is drawn from the style of mijnxtra.be (Colruyt Group's Xtra
site): its palette, shapes, spacing and tone, **not its brand**. Never use the
Xtra, Colruyt or Collect&Go names, logos, mascots or photography as our own
branding. Collect&Go may appear only as the name of the store we send
baskets to.

The source of truth is code, not this file:

- `packages/ui/src/colors.ts` — every color, in semantic groups
- `packages/ui/src/fonts.ts` — the typeface (`fontFaces`, `$body`, `$heading`)
- `packages/ui/src/tamagui.config.ts` — the `light` and `card` themes
- `packages/ui/src/components.tsx`, `Buttons.tsx`, `Typography.tsx` — the core
  components

If this file and the code disagree, the code wins; fix this file.

## Principles

1. **Calm surfaces.** Grey-blue page (`neutralColors.background.page`),
   content on white `Card`s. No colored page backgrounds, no colored cards.
2. **Teal means action.** Teal is for the primary button, links, the active
   tab, focus and selection. Not for decoration, headings or body text.
3. **One primary action per screen.** Everything else is `secondary`
   (tinted teal) or `ghost`/`LinkText`.
4. **Sentence case everywhere.** No uppercase, no letter-spacing, no
   monospace. Labels are small, medium-weight and muted.
5. **Friendly and short.** Copy talks to "you", leads with the benefit, and
   fits on one line where it can.
6. **Soft, not sharp.** Rounded corners (10px), one soft shadow, hairline
   borders. No heavy borders, no hard black shadows.

## Color

Use the semantic groups from `@pa/ui`. **Never write a hex value in a screen
or component**; if something needs a color that has no token, add it to
`colors.ts` first (and to the table below).

| Token                                        | Value               | Use                                                                                     |
| -------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `neutralColors.background.page`              | `#F3F4FA`           | Page background                                                                         |
| `neutralColors.background.elevated` / `card` | `#FFFFFF`           | Cards, inputs, sheets                                                                   |
| `neutralColors.background.hover`             | `#EBEDF5`           | Pressed rows, hover                                                                     |
| `neutralColors.text.primary`                 | `#1B1F27`           | Headings, main text                                                                     |
| `neutralColors.text.secondary`               | `#48526D`           | Body copy, descriptions                                                                 |
| `neutralColors.text.muted`                   | `#63708A`           | Labels, hints, captions                                                                 |
| `neutralColors.text.placeholder`             | `#7C89A3`           | Placeholders, disabled — never for real text                                            |
| `neutralColors.border.subtle`                | `#EBEDF5`           | Hairlines between rows, card outlines                                                   |
| `neutralColors.border.default`               | `#BBC1D3`           | Input and control borders                                                               |
| `neutralColors.border.focus`                 | `#19B3A8`           | Focus ring, selected card                                                               |
| `brandColors.primary`                        | `#009A8E`           | Primary button fill, active tab                                                         |
| `brandColors.primaryHover`                   | `#008077`           | Pressed primary                                                                         |
| `brandColors.primaryText`                    | `#008077`           | Teal text and links (4.8:1 on white)                                                    |
| `brandColors.accent`                         | `#00AB9E`           | Icons, illustrations, large accents                                                     |
| `brandColors.primaryLight`                   | `#CCEEEC`           | Secondary button fill, selected chip                                                    |
| `semanticColors.success/error/warning/info`  | —                   | Status only: `.text` for words, `.main` for icons and dots, `.surface` for tinted boxes |
| `gradientColors.primary`                     | `#159A95 → #10B8B1` | A hero banner at most; never buttons or text                                            |

Contrast rules:

- Teal text is always `brandColors.primaryText` (or `<Text variant='brand'>`),
  never `primary` or `accent`, which are too light for small text.
- Status words use `semanticColors.*.text`; the `.main` fills are for icons.
- White text only on `brandColors.primary`, `brandColors.destructive` or a
  semantic `.main` fill, at 16px semibold or larger.

## Typography

Inter in four faces (`fontFaces.regular/medium/semibold/bold`), loaded in
`App.tsx`. It stands in for Neue Haas Grotesk Display, which the source site
uses but which is licensed and can't ship in the app. Use the `@pa/ui` text
components; don't set `fontFamily` yourself except through `fontFaces`.

| Role                       | Component                                     | Size / weight      |
| -------------------------- | --------------------------------------------- | ------------------ |
| Screen title (tab root)    | `TabHeader` (via `AppShell showBack={false}`) | `$7`, semibold     |
| Section or card title      | `<Text size='$5' weight='semibold'>`          | 18–20, semibold    |
| Body                       | `<Text>` / `<Text variant='muted'>`           | `$3`–`$4`, regular |
| Field or section label     | `<MicroLabel>`                                | 13, medium, muted  |
| Prices, quantities, totals | `<MonoText>` (Inter, tabular figures)         | as needed, medium  |
| Button label               | `<ButtonText>`; main CTA `variant='cta'`      | 16–17, semibold    |
| Link                       | `<LinkText>`                                  | 14, semibold, teal |

Headings are semibold (600), never bold black blocks. Don't use
`textTransform`, `letterSpacing` or italics.

## Shape, depth and spacing

- **Radius:** 10 for buttons, cards, inputs and info boxes; 999 (pill) for
  chips and tags; 50% for avatars. Nothing square, nothing above 18.
- **Shadow:** one only — `0 3px 8px` of navy at 10% (`cardColors.shadow`),
  built into `Card` and `FormCard`. Don't add other shadows; nested cards use
  `variant='outlined'` (hairline, no shadow).
- **Borders:** 1px. Hairlines `border.subtle`; inputs `border.default`;
  focus/selection 2px `border.focus`.
- **Spacing:** 4px grid via Tamagui tokens (`$1`=4 … `$4`=16, `$6`=24,
  `$8`=32). Screen padding `$4`; card padding `$4`; gap between cards `$3`;
  between sections `$6`. When unsure, add space rather than lines.
- **Tap targets:** at least 44px high (`Button` sizes `$4`/`$5`).

## Components: what to use for what

| Need                   | Use                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| A screen               | `AppShell` (tab root: `showBack={false}`) or `ScreenHeader` for pushed screens |
| A block of content     | `Card` (default: white + shadow)                                               |
| A selectable option    | `Card interactive`, `variant='highlight'` when selected                        |
| Main action            | `Button` (primary) + `<ButtonText variant='cta'>`                              |
| Second action          | `Button variant='secondary'` + `<ButtonText variant='secondary'>`              |
| Quiet action, list row | `Button variant='ghost-row'`, or `LinkText`                                    |
| Destructive action     | `Button variant='danger'`, behind `ActionConfirmModal`                         |
| Text input             | `StyledInput` with a `MicroLabel` above it                                     |
| Feedback in a screen   | `InfoCard variant='success' \| 'error' \| 'warning' \| 'info'`                 |
| Nothing to show yet    | `EmptyState` (icon, one-line title, one-line hint, optional action)            |
| Status tag             | `StatusChip` / `Badge`                                                         |
| Loading                | `Skeleton` for content, `Spinner` only for actions                             |

Icons: `lucide-react-native`, 20–24px, `neutralColors.text.secondary` by
default, `brandColors.accent` for the one icon that should draw the eye.
Line icons only; no emoji as UI icons.

## Copy

English. Friendly, informal, short, benefit first.

- Talk to the user as "you"; the app is "we" only when it did something
  ("We sent a code to…").
- Titles say what you get, not what the screen is: "Your dinners this week",
  not "Meal plan overview".
- Buttons are verbs, two or three words: "Add to basket", "Pick recipes".
- Errors say what happened and what to do, without blame: "We couldn't reach
  Collect&Go. Check your connection and try again."
- Empty states invite the next step: "No recipes yet. Add a site you like to
  get started."
- A light touch of play is fine in empty states and success messages ("Done!
  Your basket is ready."); never in errors or anything about money.
- Sentence case, no exclamation marks in errors, no ALL CAPS, numbers as
  digits ("5 dinners"), prices with `formatEuro` from `@pa/shared`
  ("€ 3,49").

## Before calling UI work done

1. No hex or `rgba(` in `apps/mobile` outside tests:
   `grep -rnE "#[0-9A-Fa-f]{3,8}\b|rgba?\(" apps/mobile --include=*.tsx --exclude-dir=node_modules --exclude-dir=__tests__`
2. No uppercase or tracking: `grep -rn "textTransform\|letterSpacing" apps/mobile packages/ui/src --include=*.tsx`
3. One primary button per screen; teal used only for actions and selection.
4. Copy follows the rules above, in English and sentence case.
5. Look at it. Render the web build and screenshot it (headless Chrome
   renders at least ~500px wide, so the right edge may be cut off):

   ```bash
   cd apps/mobile && npx expo export --platform web --output-dir <scratch>/web
   npx serve -s <scratch>/web -l 8099   # in the background
   "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
     --window-size=500,900 --virtual-time-budget=15000 \
     --screenshot=<scratch>/shot.png http://localhost:8099/
   ```

   Screens behind sign-in need the app in Expo Go; ask the user for a
   screenshot when the change matters.
