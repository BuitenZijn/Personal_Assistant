import { styled, YStack, Label as TamaguiLabel, GetProps } from 'tamagui'

export const FormFieldContainer = styled(YStack, {
  name: 'FormFieldContainer',
  gap: '$2.5',
})

export const FormLabel = styled(TamaguiLabel, {
  name: 'FormLabel',
  fontSize: 13,
  fontWeight: '600',
  color: '$color12',

  variants: {
    size: {
      $2: {
        fontSize: 13,
      },
      $3: {
        fontSize: '$3',
      },
      $4: {
        fontSize: '$4',
      },
    },
    required: {
      true: {},
    },
  } as const,

  defaultVariants: {
    size: '$3',
  },
})

export type FormFieldContainerProps = GetProps<typeof FormFieldContainer>
export type FormLabelProps = GetProps<typeof FormLabel>
