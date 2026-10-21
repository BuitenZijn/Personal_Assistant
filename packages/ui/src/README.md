# Ella UI Components

This package contains the shared UI components for Ella's web and mobile apps, built on top of Tamagui.

## Table of Contents

- [Component Naming Conventions](#component-naming-conventions)
- [Component Categories](#component-categories)
- [Duplicate & Overlap Analysis](#duplicate--overlap-analysis)
- [Recommended Component Usage](#recommended-component-usage)
- [Adding New Components](#adding-new-components)

---

## Component Naming Conventions

### General Rules

1. **PascalCase** for all component names
2. **Descriptive names** that indicate purpose, not implementation
3. **Suffixes** to indicate component type/role:
   - `Card` - Container with elevation/borders (e.g., `ContentCard`, `StatCard`)
   - `Text` - Typography variant (e.g., `ButtonText`, `AlertText`)
   - `Button` - Clickable action element (e.g., `Button`, `IconButton`)
   - `Container` - Layout wrapper (e.g., `PageContainer`, `FormFieldContainer`)
   - `Input` / `TextArea` - Form input elements

### Naming Patterns by Category

#### Buttons

| Pattern           | Example                | Use For              |
| ----------------- | ---------------------- | -------------------- |
| `{Variant}Button` | `Button`, `IconButton` | Main button variants |
| `{Component}Text` | `ButtonText`           | Text inside buttons  |

#### Typography

| Pattern          | Example                                  | Use For                |
| ---------------- | ---------------------------------------- | ---------------------- |
| `{Scope}Title`   | `PageTitle`, `SectionTitle`, `CardTitle` | Headings by hierarchy  |
| `{Semantic}Text` | `BodyText`, `AlertText`, `LinkText`      | Body text variants     |
| `{Role}Text`     | `LabelText`, `ValueText`, `Caption`      | Special-purpose text   |
| `Text`           | `Text` (with variants)                   | Generic text component |

#### Cards

| Pattern          | Example                               | Use For                |
| ---------------- | ------------------------------------- | ---------------------- |
| `{Purpose}Card`  | `ContentCard`, `FormCard`, `StatCard` | Purpose-specific cards |
| `{Semantic}Card` | `AlertCard`, `InfoCard`               | Semantic/status cards  |
| `Card`           | `Card` (with variants)                | Generic card component |

#### Layout

| Pattern            | Example                             | Use For           |
| ------------------ | ----------------------------------- | ----------------- |
| `{Scope}Container` | `PageContainer`, `SectionContainer` | Layout containers |
| `{Type}Panel`      | `Panel`, `SidebarPanel`             | Elevated panels   |
| `{Context}Frame`   | `SheetFrame`, `DialogContentFrame`  | Overlay frames    |

#### Form Elements

| Pattern           | Example                         | Use For                |
| ----------------- | ------------------------------- | ---------------------- |
| `Styled{Element}` | `StyledInput`, `StyledTextArea` | Tamagui-styled inputs  |
| `Form{Element}`   | `FormInput`, `FormLabel`        | Form-specific elements |
| `{Element}Text`   | `FormLabelText`                 | Label text variants    |

---

## Component Categories

### 1. Buttons (`Buttons.tsx`)

| Component    | Purpose                     | Variants / Sizes                                                                                                                |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Button`     | Main call-to-action buttons | variants: `primary`, `secondary`, `danger`, `success`, `warning`, `ghost`, `outline`, `outline-danger`; sizes: `$3`, `$4`, `$5` |
| `IconButton` | Small icon-only buttons     | variants: `ghost`, `danger`, `success`                                                                                          |

> **Note:** Use `ButtonText` inside all buttons. For small buttons (previously `Button`), use `<Button size="$3">`

### 2. Typography (`Typography.tsx`, `Headings.tsx`)

**Base Text (`Typography.tsx`):**
| Component | Purpose | Variants |
|-----------|---------|----------|
| `Text` | Generic text with semantic colors | `default`, `muted`, `subtle`, `inverse`, `error`, `success`, `warning`, `info`, `brand` |
| `ButtonText` | Text inside buttons | `primary`, `secondary`, `danger`, `success`, `ghost`, `default`, `inverse`, `muted` |
| `AlertText` | Text inside alert cards | `error`, `success`, `warning`, `info` |
| `LinkText` | Clickable link text | `default`, `muted` |

**Headings (`Headings.tsx`):**
| Component | Purpose | Size |
|-----------|---------|------|
| `PageTitle` | Main page heading | 42px |
| `SectionTitle` | Section heading | 24px |
| `CardTitle` | Card heading | 18px |
| `BodyText` | Body paragraphs | 15px |
| `Caption` | Metadata, timestamps | 12px |
| `ValueText` | Display values | 14px |
| `IconText` | Emoji/icon display | 48px |

### 3. Cards

| File             | Component   | Purpose                                                                                                      |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `components.tsx` | `Card`      | **Primary card** - variants: `default`, `outlined`, `highlight`, `muted`, `success`, `ghost` + `interactive` |
| `FormCard.tsx`   | `FormCard`  | Form containers with Tamagui Card elevation                                                                  |
| `StatCard.tsx`   | `StatCard`  | Statistics display with colored values                                                                       |
| `StatCard.tsx`   | `StatValue` | Large numbers with color variants (includes `neutral` for plain numbers)                                     |
| `InfoCard.tsx`   | `InfoCard`  | Contextual information with title/text, also use for alerts (size="$3")                                      |

> **Note:** `AlertCard` was merged into `InfoCard`. Use `<InfoCard variant="error" size="$3">` for compact inline alerts.

### 4. Form Elements

| File              | Component            | Purpose                       |
| ----------------- | -------------------- | ----------------------------- |
| `FormInput.tsx`   | `FormInput`          | Native HTML input (web forms) |
| `StyledInput.tsx` | `StyledInput`        | Tamagui-styled input          |
| `StyledInput.tsx` | `StyledTextArea`     | Tamagui-styled textarea       |
| `StyledInput.tsx` | `FormLabelText`      | Uppercase label text          |
| `FormField.tsx`   | `FormFieldContainer` | Field wrapper with gap        |
| `FormField.tsx`   | `FormLabel`          | Tamagui Label styled          |

### 5. Layout

| File         | Component           | Purpose             |
| ------------ | ------------------- | ------------------- |
| `Layout.tsx` | `CenteredContainer` | Center content      |
| `Layout.tsx` | `PageContainer`     | Main page wrapper   |
| `Layout.tsx` | `SectionContainer`  | Section grouping    |
| `Layout.tsx` | `LoadingSpinner`    | Loading indicator   |
| `Panel.tsx`  | `Panel`             | Elevated panel      |
| `Panel.tsx`  | `SidebarPanel`      | Full-height sidebar |
| `Panel.tsx`  | `TableHeader`       | Table header row    |

### 6. Navigation

| File          | Component      | Purpose              |
| ------------- | -------------- | -------------------- |
| `NavLink.tsx` | `NavLink`      | Navigation link text |
| `NavLink.tsx` | `DropdownItem` | Dropdown menu item   |

### 7. Badges & Tags

| File             | Component       | Purpose                 |
| ---------------- | --------------- | ----------------------- |
| `Badge.tsx`      | `Badge`         | Status/category labels  |
| `Badge.tsx`      | `BadgeText`     | Text inside badges      |
| `MissionTag.tsx` | `MissionTag`    | Mission type indicator  |
| `MissionTag.tsx` | `IconContainer` | Icon background wrapper |

### 8. Avatar

| File         | Component    | Purpose                   |
| ------------ | ------------ | ------------------------- |
| `Avatar.tsx` | `Avatar`     | Circular avatar container |
| `Avatar.tsx` | `AvatarText` | Initials inside avatar    |

### 9. Overlays

| File          | Component            | Purpose                                                        |
| ------------- | -------------------- | -------------------------------------------------------------- |
| `Overlay.tsx` | `SheetFrame`         | Bottom sheet container                                         |
| `Overlay.tsx` | `SheetHandle`        | Sheet drag handle                                              |
| `Overlay.tsx` | `DialogContentFrame` | Dialog content wrapper                                         |
| `Overlay.tsx` | `PopupContainer`     | Dropdown/popover/menu container (use variant="menu" for menus) |

> **Note:** `MenuContainer` was merged into `PopupContainer`. Use `<PopupContainer variant="menu">` for dropdown menus.

---

## Component Architecture Notes

### Card System

The card system has been consolidated into clear purposes:

| Component  | Use Case                       | Features                                         |
| ---------- | ------------------------------ | ------------------------------------------------ |
| `Card`     | General containers             | Multiple variants, sizes, interactive mode       |
| `FormCard` | Auth/form containers           | Elevated with shadow                             |
| `StatCard` | Statistics display             | Colored value text                               |
| `InfoCard` | Structured info boxes & alerts | Title + text with semantic colors, size variants |
| `Panel`    | Sidebar/elevated panels        | Extends Card with elevated shadow                |

### Form Labels

| Component       | Use Case                                             |
| --------------- | ---------------------------------------------------- |
| `FormLabel`     | Form fields with `htmlFor` attribute (accessibility) |
| `FormLabelText` | Uppercase decorative labels (section headers)        |

### Input Components

| Component     | Platform       | Use Case                                      |
| ------------- | -------------- | --------------------------------------------- |
| `FormInput`   | Web only       | Native HTML features (password, autocomplete) |
| `StyledInput` | Cross-platform | Tamagui-styled inputs                         |

### Typography Hierarchy

| Component    | Use Case                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------ |
| `StatValue`  | Large numbers - use `variant="neutral"` for plain, or `primary`/`success`/etc. for colored |
| `ButtonText` | Text inside all buttons (Button, Button, etc.)                                             |

---

## Recommended Component Usage

### Cards - Which to Use?

```tsx
// Default card container
<Card>Content</Card>

// Interactive/clickable cards (quests, attempts, etc.)
<Card interactive>Clickable content</Card>

// Highlighted/emphasized card
<Card variant="highlight">Important content</Card>

// Subdued card background
<Card variant="muted">Secondary content</Card>

// Statistics with colored values
<StatCard variant="success">...</StatCard>

// Alerts and notifications (use InfoCard with size="$3" for compact alerts)
<InfoCard variant="error" size="$3">
  <InfoCardText variant="error">Error message</InfoCardText>
</InfoCard>
<InfoCard variant="warning">
  <InfoCardTitle variant="warning">Warning</InfoCardTitle>
  <InfoCardText variant="warning">Full info card with title</InfoCardText>
</InfoCard>

// Forms with shadow elevation (auth forms, etc.)
<FormCard>...</FormCard>
```

### Typography - Which to Use?

```tsx
// Page structure
<PageTitle>Dashboard</PageTitle>
<SectionTitle>Recent Activity</SectionTitle>
<CardTitle>Quest Details</CardTitle>

// Body content
<BodyText>Regular paragraph text</BodyText>
<Text variant="muted">Secondary text</Text>
<Caption>Dec 8, 2025</Caption>

// Labels and values
<FormLabel htmlFor="name">Name</FormLabel>  // For forms
<FormLabelText>CATEGORY</FormLabelText>       // Uppercase decorative
<ValueText>Active</ValueText>

// Large numbers
<StatValue variant="neutral">42</StatValue>           // Plain large number
<StatValue variant="success">99%</StatValue>          // Colored stat
```

### Buttons - Which to Use?

```tsx
// Main CTA buttons
<Button variant="primary">
  <ButtonText>Submit</ButtonText>
</Button>

// Smaller action buttons in lists/cards
<Button variant="danger">
  <ButtonText>Delete</ButtonText>
</Button>

// Icon-only buttons
<IconButton variant="ghost">
  <Text>🔧</Text>
</IconButton>
```

### Inputs - Which to Use?

```tsx
// Web forms requiring HTML features (password, autocomplete)
<FormInput type="password" name="password" />

// Cross-platform styled inputs
<StyledInput placeholder="Enter name..." />
<StyledTextArea placeholder="Description..." />
```

---

## Adding New Components

### Checklist

1. **Naming:** Follow the conventions above
2. **File location:**
   - New category → New file (e.g., `Tabs.tsx`)
   - Related to existing → Add to existing file
3. **Documentation:** Add JSDoc comment with:
   - Purpose description
   - Available variants
   - Design system color notes
4. **Export:** Add to `index.ts` with type export
5. **Variants:** Use Tamagui variants, not inline styles
6. **Colors:** Import from `./colors.ts`, never hardcode

### Template

```tsx
import { styled, GetProps, YStack } from "tamagui";
import { neutralColors, brandColors } from "./colors";

/**
 * ComponentName - Brief description
 * Uses Digital Compass design system colors.
 *
 * Variants:
 * - variant: "default" | "primary" | "danger"
 * - size: "$3" | "$4" | "$5"
 */
export const ComponentName = styled(YStack, {
  name: "ComponentName",
  // Base styles...

  variants: {
    variant: {
      default: {
        backgroundColor: neutralColors.background.elevated,
      },
      primary: {
        backgroundColor: brandColors.primary,
      },
    },
    size: {
      $3: { padding: "$3" },
      $4: { padding: "$4" },
      $5: { padding: "$5" },
    },
  } as const,

  defaultVariants: {
    variant: "default",
    size: "$4",
  },
});

export type ComponentNameProps = GetProps<typeof ComponentName>;
```

---

## Color System Reference

All components use colors from `./colors.ts`:

- `brandColors` - Primary (Solar Amber), Secondary (Forest Green), Destructive
- `neutralColors` - Backgrounds, borders, text colors
- `semanticColors` - Error, success, warning, info states
- `statusColors` - Active, draft, archived, completed
- `roleColors` - Admin, manager, player roles
- `mapColors` - Map-specific colors

**Never use inline color values** - always import from the color system.
