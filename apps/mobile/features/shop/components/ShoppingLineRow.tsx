import React from 'react'
import {
  Button,
  MonoText,
  Text,
  XStack,
  YStack,
  brandColors,
  neutralColors,
} from '@pa/ui'
import type { api } from '@pa/backend/api'
import type { FunctionReturnType } from 'convex/server'
import { Minus, Plus, X } from 'lucide-react-native'
import { productName, unitPrice } from '../../products/format'
import { lineQuantity, recipeTitles, stepQuantity } from '../format'

export type ShoppingLine = NonNullable<
  NonNullable<
    FunctionReturnType<typeof api.functions.shoppingLists.current>
  >['list']
>['lines'][number]

/** − 3× + for a product; ingredients without a product have no stepper. */
function QuantityStepper({
  line,
  onChange,
}: {
  line: ShoppingLine
  onChange: (quantity: number) => void
}) {
  const quantity = line.quantity ?? 1
  return (
    <XStack alignItems='center' gap='$2'>
      <Button
        variant='secondary'
        size='$2'
        circular
        disabled={stepQuantity(quantity, line.soldByWeight, -1) === quantity}
        onPress={() => onChange(stepQuantity(quantity, line.soldByWeight, -1))}
        accessibilityLabel='Less'
        icon={<Minus size={16} color={brandColors.primaryText} />}
      />
      <MonoText size='$3' minWidth={56} textAlign='center'>
        {lineQuantity(line)}
      </MonoText>
      <Button
        variant='secondary'
        size='$2'
        circular
        onPress={() => onChange(stepQuantity(quantity, line.soldByWeight, 1))}
        accessibilityLabel='More'
        icon={<Plus size={16} color={brandColors.primaryText} />}
      />
    </XStack>
  )
}

/** One line of the shopping list: what, for which dinners, how much. */
export function ShoppingLineRow({
  line,
  onQuantity,
  onRemove,
}: {
  line: ShoppingLine
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const forDinners = recipeTitles(line.covers)
  const details = line.productId
    ? [
        forDinners ? `For ${forDinners}` : 'Recommended',
        line.unitPriceCents === null
          ? null
          : unitPrice(line.unitPriceCents, line.soldByWeight),
      ]
    : [
        lineQuantity(line) || null,
        'Not in your receipts yet',
        forDinners ? `for ${forDinners}` : null,
      ]

  return (
    <YStack gap='$2' paddingVertical='$3'>
      <XStack alignItems='flex-start' gap='$3'>
        <YStack flex={1} gap='$1'>
          <Text size='$4' weight='medium' numberOfLines={2}>
            {line.productId ? productName(line.name) : line.name}
          </Text>
          <Text size='$2' variant='muted' numberOfLines={2}>
            {details.filter(Boolean).join(' · ')}
          </Text>
        </YStack>
        <Button
          variant='ghost'
          size='$2'
          circular
          onPress={onRemove}
          accessibilityLabel={`Remove ${line.name}`}
          icon={<X size={16} color={neutralColors.text.secondary} />}
        />
      </XStack>
      {line.productId ? (
        <QuantityStepper line={line} onChange={onQuantity} />
      ) : null}
    </YStack>
  )
}
