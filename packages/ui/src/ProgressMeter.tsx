import { styled, YStack, GetProps } from 'tamagui'
import { brandColors, neutralColors, semanticColors } from './colors'

/**
 * ProgressMeter - A thin horizontal fill bar for progress through a sequence
 *
 * Extracted from the two hand-rolled gradient bars that previously lived in the
 * leaderboard and the control room device panel, so quest progress reads the
 * same everywhere.
 *
 * Usage:
 * ```tsx
 * <ProgressMeter value={62} />
 * <ProgressMeter value={100} variant="success" size="large" />
 * ```
 */

const MeterTrack = styled(YStack, {
  name: 'MeterTrack',
  backgroundColor: neutralColors.background.page,
  borderRadius: 999,
  overflow: 'hidden',
  width: '100%',

  variants: {
    size: {
      small: { height: 4 },
      medium: { height: 6 },
      large: { height: 10 },
    },
  } as const,

  defaultVariants: {
    size: 'medium',
  },
})

const MeterFill = styled(YStack, {
  name: 'MeterFill',
  height: '100%',
  borderRadius: 999,

  variants: {
    variant: {
      /** Amber → teal sweep, the default for quest progress */
      gradient: {
        backgroundColor: brandColors.primary,
        // Tamagui has no gradient token; this is the one place the sweep is
        // defined, rather than repeated at each usage site.
        style: {
          background: `linear-gradient(90deg, ${brandColors.primary}, ${brandColors.secondary})`,
        },
      },
      success: {
        backgroundColor: semanticColors.success.main,
      },
      warning: {
        backgroundColor: semanticColors.warning.main,
      },
      error: {
        backgroundColor: semanticColors.error.main,
      },
      muted: {
        backgroundColor: neutralColors.text.muted,
      },
      /** Fill colour supplied by the caller, e.g. a team colour */
      custom: {},
    },
  } as const,

  defaultVariants: {
    variant: 'gradient',
  },
})

export type ProgressMeterProps = Omit<
  GetProps<typeof MeterTrack>,
  'children'
> & {
  /** Progress from 0 to 100. Values outside the range are clamped. */
  value: number
  variant?: 'gradient' | 'success' | 'warning' | 'error' | 'muted' | 'custom'
  size?: 'small' | 'medium' | 'large'
  /**
   * Fill colour, only used with `variant="custom"`. Pass a design token or a
   * value that came from data (a team's assigned colour), never a literal.
   */
  color?: string
  /**
   * Show a sliver of fill even at 0, so an entry that exists but hasn't started
   * still reads as a row rather than an empty track.
   */
  minVisible?: boolean
  ariaLabel?: string
}

export function ProgressMeter({
  value,
  variant = 'gradient',
  size = 'medium',
  color,
  minVisible = false,
  ariaLabel,
  ...trackProps
}: ProgressMeterProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const width = minVisible ? Math.max(clamped, 3) : clamped

  return (
    <MeterTrack
      size={size}
      role='progressbar'
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      {...trackProps}
    >
      <MeterFill
        variant={variant}
        width={`${width}%`}
        backgroundColor={variant === 'custom' ? color : undefined}
      />
    </MeterTrack>
  )
}

export type MeterTrackProps = GetProps<typeof MeterTrack>
export type MeterFillProps = GetProps<typeof MeterFill>
