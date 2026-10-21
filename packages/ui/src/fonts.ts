import { createFont, isWeb } from 'tamagui'
import { config } from '@tamagui/config/v3'

/**
 * House-style typeface faces — Inter, a free stand-in for the grotesk the
 * style is drawn from. The app registers these names via
 * @expo-google-fonts/inter (App.tsx); where a face isn't registered, the
 * platform falls back to its default sans.
 *
 * React Native doesn't synthesize weights for custom fonts, so each weight is
 * its own face. Tamagui picks the face from `fontWeight` through `face`
 * below; components that set `fontFamily` directly use these names.
 */
export const fontFaces = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const

const face = {
  400: { normal: fontFaces.regular },
  500: { normal: fontFaces.medium },
  600: { normal: fontFaces.semibold },
  700: { normal: fontFaces.bold },
}

const family = isWeb
  ? 'Inter, -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  : fontFaces.regular

/** `$body`: running text, labels, buttons. */
export const bodyFont = createFont({ ...config.fonts.body, family, face })

/** `$heading`: titles, semibold by default. */
export const headingFont = createFont({
  ...config.fonts.heading,
  family,
  face,
  weight: { ...config.fonts.heading.weight, true: '600' },
})
