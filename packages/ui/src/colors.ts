/**
 * House Style - Color Palette
 *
 * Fresh teal on cool blue-grey neutrals: light grey-blue pages, white cards
 * with a soft shadow, dark navy text, teal actions. The style and its rules
 * are described in .claude/skills/house-style/SKILL.md.
 * Components only use the semantic groups below, never raw values.
 */

// =============================================================================
// Core Palette
// =============================================================================

/**
 * Raw color values of the house style.
 * @internal - Do not import directly, use semantic color groups instead
 */
const paletteColors = {
  /** Teal 50 - faintest tint (selected rows) */
  teal50: '#EFF9F9',
  /** Teal 100 - subtle teal backgrounds */
  teal100: '#E5F7F5',
  /** Teal 200 - secondary button fill */
  teal200: '#CCEEEC',
  /** Teal 400 - focus rings, active borders */
  teal400: '#19B3A8',
  /** Teal 500 - the brand teal: icons, illustrations, large accents */
  teal500: '#00AB9E',
  /** Teal 600 - primary button fill (white label, large text) */
  teal600: '#009A8E',
  /** Teal 700 - pressed fill, teal text and links on white (4.8:1) */
  teal700: '#008077',
  /** Teal 800 - teal text on teal tints */
  teal800: '#00564F',

  /** Neutral 000 - cards and surfaces */
  white: '#FFFFFF',
  /** Neutral 100 - page background */
  neutral100: '#F3F4FA',
  /** Neutral 200 - hover/pressed surfaces, hairlines */
  neutral200: '#EBEDF5',
  /** Neutral 300 - input and control borders */
  neutral300: '#BBC1D3',
  /** Neutral 500 - placeholders, disabled */
  neutral500: '#7C89A3',
  /** Neutral 600 - muted text (4.9:1 on white) */
  neutral600: '#63708A',
  /** Neutral 700 - secondary text */
  neutral700: '#48526D',
  /** Neutral 800 - body text */
  neutral800: '#2E3B56',
  /** Neutral 900 - headings, strongest text */
  neutral900: '#1B1F27',

  /** Blue - information */
  blue: '#1B7FA6',
  blueFill: '#28A2CF',
  blueLight: '#D6F0FB',
  /** Green - success */
  green: '#2F7D47',
  greenFill: '#4EA968',
  greenLight: '#E3F3E7',
  /** Orange - warnings */
  orange: '#B45309',
  orangeFill: '#ED6B06',
  orangeLight: '#FDEBDC',
  /** Red - destructive actions and errors */
  red: '#DB0000',
  redFill: '#E62D32',
  redHover: '#C4161B',
  redLight: '#FFEFEF',
} as const

// =============================================================================
// Brand Colors - Primary accent colors (teal)
// =============================================================================

export const brandColors = {
  /** Primary brand color - main CTAs, active states */
  primary: paletteColors.teal600,
  /** Primary hover/active state */
  primaryHover: paletteColors.teal700,
  /** Primary for text and links on light backgrounds */
  primaryText: paletteColors.teal700,
  /** Accents and highlights: icons, illustrations, the active tab */
  accent: paletteColors.teal500,
  /** Light primary for subtle backgrounds and the secondary button */
  primaryLight: paletteColors.teal200,

  /** Secondary brand color - information (blue) */
  secondary: paletteColors.blueFill,
  /** Secondary hover state */
  secondaryHover: paletteColors.blue,
  /** Secondary light for subtle backgrounds */
  secondaryLight: paletteColors.blueLight,

  /** Destructive color - errors, delete actions (red) */
  destructive: paletteColors.redFill,
  /** Destructive hover state */
  destructiveHover: paletteColors.redHover,
  /** Destructive light for subtle backgrounds */
  destructiveLight: paletteColors.redLight,

  /** Error color - text-safe red */
  error: paletteColors.red,
} as const

// =============================================================================
// Semantic Colors - For conveying meaning
// =============================================================================

/**
 * Use these for status indicators, alerts, and feedback.
 * Each has: text (for labels), background (for fills), surface (the same
 * tint as an opaque color), border (for outlines), main (for icons/dots)
 */
export const semanticColors = {
  success: {
    text: paletteColors.green,
    background: paletteColors.greenLight,
    surface: paletteColors.greenLight,
    border: paletteColors.greenFill,
    main: paletteColors.greenFill,
    hover: paletteColors.green,
  },
  error: {
    text: paletteColors.red,
    background: paletteColors.redLight,
    surface: paletteColors.redLight,
    border: paletteColors.redFill,
    main: paletteColors.redFill,
    hover: paletteColors.redHover,
  },
  warning: {
    text: paletteColors.orange,
    background: paletteColors.orangeLight,
    surface: paletteColors.orangeLight,
    border: paletteColors.orangeFill,
    main: paletteColors.orangeFill,
    hover: paletteColors.orange,
  },
  info: {
    text: paletteColors.blue,
    background: paletteColors.blueLight,
    surface: paletteColors.blueLight,
    border: paletteColors.blueFill,
    main: paletteColors.blueFill,
    hover: paletteColors.blue,
  },
} as const

// =============================================================================
// Neutral Colors - For layout, text, and borders
// =============================================================================

export const neutralColors = {
  /** Background colors - use for cards, sections, hover states */
  background: {
    page: paletteColors.neutral100,
    elevated: paletteColors.white,
    /** Card background - alias for elevated */
    card: paletteColors.white,
    hover: paletteColors.neutral200,
    active: paletteColors.neutral200,
  },

  /** Text colors - use for content hierarchy */
  text: {
    /** Primary text - headings and main content */
    primary: paletteColors.neutral900,
    /** Secondary text - body copy, labels, descriptions */
    secondary: paletteColors.neutral700,
    /** Tertiary text - less important, alias for muted */
    tertiary: paletteColors.neutral600,
    /** Muted text - hints, captions */
    muted: paletteColors.neutral600,
    /** Placeholder and disabled text */
    placeholder: paletteColors.neutral500,
    /** Inverse text - on dark backgrounds */
    inverse: paletteColors.white,
    /** Text and icons on a brand fill (teal, red buttons) */
    onFill: paletteColors.white,
  },

  /** Border colors */
  border: {
    /** Inputs and controls */
    default: paletteColors.neutral300,
    /** Hairlines between rows, card outlines */
    subtle: paletteColors.neutral200,
    strong: paletteColors.neutral500,
    focus: paletteColors.teal400,
  },
} as const

// =============================================================================
// Card Colors - White cards on the grey-blue page
// =============================================================================

/**
 * Cards are white with dark text and a soft navy shadow. The `card` Tamagui
 * theme is built from these, so text inside a card picks them up through
 * theme tokens.
 */
export const cardColors = {
  background: paletteColors.white,
  hover: paletteColors.neutral100,
  text: paletteColors.neutral900,
  textSecondary: paletteColors.neutral700,
  textMuted: paletteColors.neutral600,
  border: paletteColors.neutral200,
  /** Button fill on a card */
  button: paletteColors.teal600,
  buttonHover: paletteColors.teal700,
  /** Button label on a card */
  onButton: paletteColors.white,
  /** The card shadow: 0 3px 8px of navy at 10% */
  shadow: 'rgba(46, 59, 86, 0.1)',
} as const

// =============================================================================
// Role Colors - For user permissions (admin badge, etc.)
// =============================================================================

export const roleColors = {
  admin: {
    background: paletteColors.teal100,
    text: paletteColors.teal800,
    border: paletteColors.teal400,
  },
  user: {
    background: paletteColors.blueLight,
    text: paletteColors.blue,
    border: paletteColors.blueFill,
  },
  debug: {
    background: paletteColors.redLight,
    text: paletteColors.red,
    border: paletteColors.redFill,
  },
} as const

// =============================================================================
// Status Colors - For item status badges
// =============================================================================

export const statusColors = {
  active: {
    background: paletteColors.teal100,
    text: paletteColors.teal800,
    border: paletteColors.teal400,
  },
  draft: {
    background: paletteColors.neutral200,
    text: paletteColors.neutral700,
    border: paletteColors.neutral300,
  },
  archived: {
    background: paletteColors.neutral100,
    text: paletteColors.neutral600,
    border: paletteColors.neutral300,
  },
} as const

// =============================================================================
// Team Colors - For telling series apart (e.g. household members)
// =============================================================================

export const teamColors = [
  '#00AB9E', // Teal
  '#28A2CF', // Blue
  '#ED6B06', // Orange
  '#90B117', // Lime
  '#E42313', // Red
  '#1652A1', // Navy
  '#F8A220', // Amber
  '#4EA968', // Green
  '#63708A', // Slate
  '#10B8B1', // Aqua
] as const

export type TeamColor = (typeof teamColors)[number]

// =============================================================================
// Gradients - For the occasional hero banner, never for buttons or text
// =============================================================================

export const gradientColors = {
  /** The brand teal gradient, at 134° */
  primary: ['#159A95', '#10B8B1'],
} as const

// =============================================================================
// Overlay Colors - For modal backdrops and overlays
// =============================================================================

export const overlayColors = {
  /** Light overlay - for dropdowns, popovers */
  light: 'rgba(27, 31, 39, 0.3)',
  /** Medium overlay - for sheets, drawers */
  medium: 'rgba(27, 31, 39, 0.5)',
  /** Dark overlay - for modals, alerts */
  dark: 'rgba(27, 31, 39, 0.7)',
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
export type GradientColors = typeof gradientColors
export type OverlayColors = typeof overlayColors
