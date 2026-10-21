import { config } from '@tamagui/config/v3'
import { createTamagui } from 'tamagui'
import { neutralColors, brandColors, cardColors } from './colors'
import { bodyFont, headingFont } from './fonts'

// The house light theme: grey-blue pages, white cards, navy text, teal actions
const houseLight = {
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
  color1: neutralColors.text.placeholder,
  color2: neutralColors.text.muted,
  color3: neutralColors.text.muted,
  color4: neutralColors.text.muted,
  color5: neutralColors.text.muted,
  color6: neutralColors.text.muted,
  color7: neutralColors.text.secondary,
  color8: neutralColors.text.secondary,
  color9: neutralColors.text.secondary,
  color10: neutralColors.text.secondary,
  color11: neutralColors.text.muted,
  color12: neutralColors.text.primary,

  // Border colors
  borderColor: neutralColors.border.default,
  borderColorHover: neutralColors.border.strong,
  borderColorFocus: neutralColors.border.focus,
  borderColorPress: neutralColors.border.strong,

  // Placeholder
  placeholderColor: neutralColors.text.placeholder,

  // Shadow
  shadowColor: cardColors.shadow,
  shadowColorHover: cardColors.shadow,
  shadowColorPress: cardColors.shadow,
  shadowColorFocus: cardColors.shadow,

  // Outline (for focus states)
  outlineColor: neutralColors.border.focus,

  // Brand fill (buttons) and the label on it
  brand: brandColors.primary,
  brandHover: brandColors.primaryHover,
  onBrand: neutralColors.text.onFill,
} as const

// Inside cards: a white surface. Text and buttons stay as on the page; only
// the surfaces change. Applied with `<Theme name='card'>` (Card, FormCard and
// InfoCard do this themselves).
const houseCard = {
  ...houseLight,
  background: cardColors.background,
  backgroundHover: cardColors.hover,
  backgroundPress: cardColors.hover,
  backgroundFocus: cardColors.hover,
  backgroundStrong: cardColors.background,

  borderColor: neutralColors.border.default,

  brand: cardColors.button,
  brandHover: cardColors.buttonHover,
  onBrand: cardColors.onButton,
} as const

const tamaguiConfig = createTamagui({
  ...config,
  fonts: { ...config.fonts, body: bodyFont, heading: headingFont },
  // Only ship our own themes. Spreading config.themes here pulls in every
  // default color theme and component sub-theme that the app never uses.
  themes: {
    light: houseLight,
    // Also set dark to light for consistency (the app is light-only)
    dark: houseLight,
    light_card: houseCard,
    dark_card: houseCard,
  },
  defaultTheme: 'light',
})

export type Conf = typeof tamaguiConfig

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig
