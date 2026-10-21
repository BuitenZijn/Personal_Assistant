import { config } from '@tamagui/config/v3'
import { createTamagui } from 'tamagui'
import { neutralColors, brandColors, cardColors } from './colors'

// The Ella light theme: cream pages, blue actions, pink text
const ellaLight = {
  // Background colors
  background: neutralColors.background.page,
  backgroundHover: neutralColors.background.hover,
  backgroundPress: neutralColors.background.active,
  backgroundFocus: neutralColors.background.active,
  backgroundStrong: neutralColors.background.elevated,
  backgroundTransparent: 'transparent',

  // Text colors - color12 is the strongest text, color1 the faintest
  color: neutralColors.text.primary,
  colorHover: neutralColors.text.primary,
  colorPress: neutralColors.text.secondary,
  colorFocus: neutralColors.text.primary,
  color1: neutralColors.text.muted,
  color2: neutralColors.text.muted,
  color3: neutralColors.text.muted,
  color4: neutralColors.text.muted,
  color5: neutralColors.text.secondary,
  color6: neutralColors.text.secondary,
  color7: neutralColors.text.secondary,
  color8: neutralColors.text.secondary,
  color9: neutralColors.text.secondary,
  color10: neutralColors.text.secondary,
  color11: neutralColors.text.secondary,
  color12: neutralColors.text.primary,

  // Border colors
  borderColor: neutralColors.border.default,
  borderColorHover: neutralColors.border.strong,
  borderColorFocus: brandColors.primary,
  borderColorPress: neutralColors.border.strong,

  // Placeholder
  placeholderColor: neutralColors.text.muted,

  // Shadow
  shadowColor: 'rgba(0,0,0,0.08)',
  shadowColorHover: 'rgba(0,0,0,0.12)',
  shadowColorPress: 'rgba(0,0,0,0.12)',
  shadowColorFocus: 'rgba(0,0,0,0.12)',

  // Outline (for focus states)
  outlineColor: brandColors.primary,

  // Brand fill (buttons, links) and the label on it
  brand: brandColors.primary,
  brandHover: brandColors.primaryHover,
  onBrand: neutralColors.text.onFill,
} as const

// Inside cards and game tiles: blue surface, white text, white buttons with
// a blue label. Applied with `<Theme name='card'>` (Card, FormCard and
// InfoCard do this themselves).
const ellaCard = {
  ...ellaLight,
  background: cardColors.background,
  backgroundHover: cardColors.hover,
  backgroundPress: cardColors.hover,
  backgroundFocus: cardColors.hover,
  backgroundStrong: cardColors.background,

  color: cardColors.text,
  colorHover: cardColors.text,
  colorPress: cardColors.textSecondary,
  colorFocus: cardColors.text,
  color1: cardColors.textMuted,
  color2: cardColors.textMuted,
  color3: cardColors.textMuted,
  color4: cardColors.textMuted,
  color5: cardColors.textSecondary,
  color6: cardColors.textSecondary,
  color7: cardColors.textSecondary,
  color8: cardColors.textSecondary,
  color9: cardColors.textSecondary,
  color10: cardColors.textSecondary,
  color11: cardColors.textSecondary,
  color12: cardColors.text,

  borderColor: cardColors.border,
  borderColorHover: cardColors.text,
  borderColorFocus: cardColors.text,
  borderColorPress: cardColors.text,

  placeholderColor: cardColors.textMuted,
  outlineColor: cardColors.text,

  brand: cardColors.button,
  brandHover: cardColors.buttonHover,
  onBrand: cardColors.onButton,
} as const

const tamaguiConfig = createTamagui({
  ...config,
  // Only ship our own themes. Spreading config.themes here pulls in every
  // default color theme and component sub-theme (~2.6MB of CSS inlined into
  // each SSR response on web) that the app never uses.
  themes: {
    light: ellaLight,
    // Also set dark to light for consistency (the app is light-only)
    dark: ellaLight,
    light_card: ellaCard,
    dark_card: ellaCard,
  },
  defaultTheme: 'light',
})

export type Conf = typeof tamaguiConfig

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig
