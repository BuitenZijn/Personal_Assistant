import { styled, Card as TamaguiCard, GetProps, Theme } from 'tamagui'
import { cardColors } from './colors'

/**
 * FormCard - Elevated card for forms (auth, settings, etc.)
 * A white card with the soft navy shadow; its contents use the `card` theme.
 */
const FormCardFrame = styled(TamaguiCard, {
  name: 'FormCard',
  padding: '$6',
  backgroundColor: cardColors.background,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: cardColors.background,
  elevation: 2,
  shadowColor: cardColors.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 8,
  shadowOpacity: 1,

  variants: {
    size: {
      $4: {
        padding: '$4',
        borderRadius: 10,
      },
      $5: {
        padding: '$5',
        borderRadius: 10,
      },
      $6: {
        padding: '$6',
        borderRadius: 10,
      },
    },
  } as const,

  defaultVariants: {
    size: '$6',
  },
})

export const FormCard = FormCardFrame.styleable(function FormCard(props, ref) {
  return (
    <Theme name='card'>
      <FormCardFrame ref={ref} {...props} />
    </Theme>
  )
})

export type FormCardProps = GetProps<typeof FormCard>
