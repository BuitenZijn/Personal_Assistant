import { styled, Card as TamaguiCard, GetProps, Theme } from 'tamagui'
import { cardColors } from './colors'

/**
 * FormCard - Elevated card for forms (auth, settings, etc.)
 * A blue card whose contents use the `card` theme (white text, white buttons).
 */
const FormCardFrame = styled(TamaguiCard, {
  name: 'FormCard',
  padding: '$6',
  backgroundColor: cardColors.background,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: cardColors.background,
  elevation: 4,
  shadowColor: '#000',
  shadowRadius: 20,
  shadowOpacity: 0.3,

  variants: {
    size: {
      $4: {
        padding: '$4',
        borderRadius: 10,
      },
      $5: {
        padding: '$5',
        borderRadius: 12,
      },
      $6: {
        padding: '$6',
        borderRadius: 12,
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
