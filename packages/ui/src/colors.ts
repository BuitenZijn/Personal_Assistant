/**
 * Ella Design System - Color Palette
 *
 * Ella's brand palette: cream pages (PANTONE P 3-9 C), white cards, blue
 * buttons and frames (P 104-8 C), pink text (P 73-7 C).
 * Components only use the semantic groups below, never raw values.
 */

// =============================================================================
// Ella - Core Palette
// =============================================================================

/**
 * Raw color values for the Ella theme.
 * @internal - Do not import directly, use semantic color groups instead
 */
const paletteColors = {
  /** Cream (PANTONE P 3-9 C) - page background */
  cream: '#F1EEDB',
  /** White - cards and surfaces */
  white: '#FFFFFF',
  /** Cream hover - hover/pressed surfaces */
  creamHover: '#E7E4D2',
  /** Ella blue (PANTONE P 104-8 C) - buttons and frames; white text on it stays readable */
  ellaBlue: '#005DAC',
  /** Ella blue hover */
  ellaBlueHover: '#004F92',
  /** Ella blue light - subtle blue backgrounds */
  ellaBlueLight: 'rgba(0, 93, 172, 0.12)',
  /** Blue - secondary, information */
  blue: '#186DB7',
  /** Blue hover */
  blueHover: '#115490',
  /** Blue light - subtle blue backgrounds */
  blueLight: 'rgba(24, 109, 183, 0.12)',
  /** Green - success */
  green: '#2E8B3A',
  /** Green hover */
  greenHover: '#256F2E',
  /** Green light - subtle green backgrounds */
  greenLight: 'rgba(46, 139, 58, 0.12)',
  /** Orange - warnings */
  orange: '#AF5F18',
  /** Orange hover */
  orangeHover: '#945014',
  /** Orange light - subtle orange backgrounds */
  orangeLight: 'rgba(224, 122, 31, 0.14)',
  /** Rust red - destructive actions and errors */
  rust: '#B71D2E',
  /** Rust red hover */
  rustHover: '#901624',
  /** Rust red light - subtle red backgrounds */
  rustLight: 'rgba(183, 29, 46, 0.1)',
  /** Pink (PANTONE P 73-7 C) - headers and text */
  pink: '#EE478C',
  /** Pink muted - placeholders, inactive icons */
  pinkMuted: '#EF689C',
  /** Gray - neutral labels (archived status) */
  gray: '#4D4766',
} as const

// =============================================================================
// Brand Colors - Primary accent colors (Ella blue)
// =============================================================================

export const brandColors = {
  /** Primary brand color - main CTAs, links, active states */
  primary: paletteColors.ellaBlue,
  /** Primary hover/active state */
  primaryHover: paletteColors.ellaBlueHover,
  /** Primary for text on light backgrounds */
  primaryText: paletteColors.ellaBlue,
  /** Accents and highlights */
  accent: paletteColors.ellaBlue,
  /** Light primary for subtle backgrounds */
  primaryLight: paletteColors.ellaBlueLight,

  /** Secondary brand color - information (blue) */
  secondary: paletteColors.blue,
  /** Secondary hover state */
  secondaryHover: paletteColors.blueHover,
  /** Secondary light for subtle backgrounds */
  secondaryLight: paletteColors.blueLight,

  /** Destructive color - errors, delete actions (rust red) */
  destructive: paletteColors.rust,
  /** Destructive hover state */
  destructiveHover: paletteColors.rustHover,
  /** Destructive light for subtle backgrounds */
  destructiveLight: paletteColors.rustLight,

  /** Error color - alias for destructive */
  error: paletteColors.rust,
} as const

// =============================================================================
// Semantic Colors - For conveying meaning
// =============================================================================

/**
 * Use these for status indicators, alerts, and feedback.
 * Each has: text (for labels), background (for fills), surface (the same
 * tint as an opaque color, for boxes that may sit on a blue card), border (for
 * outlines), main (for icons/dots)
 */
export const semanticColors = {
  success: {
    text: paletteColors.green,
    background: paletteColors.greenLight,
    surface: '#DAE2C8',
    border: paletteColors.green,
    main: paletteColors.green,
    hover: paletteColors.greenHover,
  },
  error: {
    text: paletteColors.rust,
    background: paletteColors.rustLight,
    surface: '#EBD9CA',
    border: paletteColors.rust,
    main: paletteColors.rust,
    hover: paletteColors.rustHover,
  },
  warning: {
    text: paletteColors.orange,
    background: paletteColors.orangeLight,
    surface: '#EFDEC1',
    border: paletteColors.orange,
    main: paletteColors.orange,
    hover: paletteColors.orangeHover,
  },
  info: {
    text: paletteColors.blue,
    background: paletteColors.blueLight,
    surface: '#D7DFD7',
    border: paletteColors.blue,
    main: paletteColors.blue,
    hover: paletteColors.blueHover,
  },
} as const

// =============================================================================
// Neutral Colors - For layout, text, and borders
// =============================================================================

export const neutralColors = {
  /** Background colors - use for cards, sections, hover states */
  background: {
    page: paletteColors.cream,
    elevated: paletteColors.white,
    /** Card background - alias for elevated */
    card: paletteColors.white,
    hover: paletteColors.creamHover,
    active: paletteColors.creamHover,
  },

  /** Text colors - use for content hierarchy */
  text: {
    /** Primary text - main content */
    primary: paletteColors.pink,
    /** Secondary text - labels, descriptions */
    secondary: paletteColors.pink,
    /** Tertiary text - less important, alias for muted */
    tertiary: paletteColors.pinkMuted,
    /** Muted text - placeholders, disabled */
    muted: paletteColors.pinkMuted,
    /** Inverse text - on dark backgrounds */
    inverse: paletteColors.white,
    /** Text and icons on a brand fill (green, blue, rust buttons) */
    onFill: paletteColors.white,
  },

  /** Border colors */
  border: {
    default: paletteColors.ellaBlue,
    /** Subtle border - alias for default */
    subtle: paletteColors.ellaBlue,
    strong: paletteColors.ellaBlueHover,
    focus: paletteColors.ellaBlue,
  },
} as const

// =============================================================================
// Card Colors - For cards and game tiles (blue surface, white text)
// =============================================================================

/**
 * Cards are blue with white text; buttons on a card invert to white with a
 * blue label. The `card` Tamagui theme is built from these, so text inside a
 * card picks them up through theme tokens.
 */
export const cardColors = {
  background: paletteColors.ellaBlue,
  hover: paletteColors.ellaBlueHover,
  text: paletteColors.white,
  /** Secondary text on a card (5.3:1 on the blue) */
  textSecondary: '#D9E7F3',
  /** Muted text on a card (4.9:1 on the blue) */
  textMuted: '#CCDFEE',
  border: 'rgba(255, 255, 255, 0.35)',
  /** Button fill on a card */
  button: paletteColors.white,
  buttonHover: '#E6EFF7',
  /** Button label on a card */
  onButton: paletteColors.ellaBlue,
} as const

// =============================================================================
// Role Colors - For user permissions (admin badge, etc.)
// =============================================================================

export const roleColors = {
  admin: {
    background: paletteColors.ellaBlueLight,
    text: paletteColors.ellaBlue,
    border: paletteColors.ellaBlue,
  },
  user: {
    background: paletteColors.blueLight,
    text: paletteColors.blue,
    border: paletteColors.blue,
  },
  debug: {
    background: paletteColors.rustLight,
    text: paletteColors.rust,
    border: paletteColors.rust,
  },
} as const

// =============================================================================
// Status Colors - For quest/item status badges
// =============================================================================

export const statusColors = {
  active: {
    background: paletteColors.blueLight,
    text: paletteColors.blue,
    border: paletteColors.blue,
  },
  draft: {
    background: paletteColors.ellaBlueLight,
    text: paletteColors.ellaBlue,
    border: paletteColors.ellaBlue,
  },
  archived: {
    background: 'rgba(107, 124, 138, 0.15)',
    text: paletteColors.gray,
    border: paletteColors.gray,
  },
} as const

// =============================================================================
// Team Colors - For telling teams apart (e.g. quiz teams)
// =============================================================================

export const teamColors = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Seafoam
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
] as const

export type TeamColor = (typeof teamColors)[number]

// =============================================================================
// Overlay Colors - For modal backdrops and overlays
// =============================================================================

export const overlayColors = {
  /** Light overlay - for dropdowns, popovers */
  light: 'rgba(0, 0, 0, 0.3)',
  /** Medium overlay - for sheets, drawers */
  medium: 'rgba(0, 0, 0, 0.5)',
  /** Dark overlay - for modals, alerts */
  dark: 'rgba(0, 0, 0, 0.7)',
} as const

// =============================================================================
// Type Exports
// =============================================================================

export type BrandColors = typeof brandColors
export type SemanticColors = typeof semanticColors
export type NeutralColors = typeof neutralColors
export type CardColors = typeof cardColors
export type RoleColors = typeof roleColors
export type StatusColors = typeof statusColors
export type OverlayColors = typeof overlayColors
