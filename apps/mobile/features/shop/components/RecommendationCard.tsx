import React from 'react'
import {
  Button,
  ButtonText,
  Card,
  MonoText,
  Text,
  YStack,
  brandColors,
} from '@pa/ui'
import type { api } from '@pa/backend/api'
import type { FunctionReturnType } from 'convex/server'
import { Plus } from 'lucide-react-native'
import {
  interval,
  productName,
  shortDate,
  unitPrice,
} from '../../products/format'

export type Recommendation = FunctionReturnType<
  typeof api.functions.shoppingLists.recommendations
>[number]

export const RECOMMENDATION_WIDTH = 176

/** A product they're about to run out of, in the swimlane. */
export function RecommendationCard({
  product,
  onAdd,
}: {
  product: Recommendation
  onAdd: () => void
}) {
  const year = new Date().getFullYear()
  const when = [
    product.averageIntervalDays === null
      ? null
      : `About ${interval(product.averageIntervalDays)}`,
    `last on ${shortDate(product.lastBoughtOn, year)}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Card padding='$3' width={RECOMMENDATION_WIDTH}>
      <YStack flex={1} gap='$2' justifyContent='space-between'>
        <YStack gap='$1'>
          <Text size='$3' weight='medium' numberOfLines={2}>
            {productName(product.name)}
          </Text>
          <Text size='$2' variant='muted' numberOfLines={2}>
            {when}
          </Text>
        </YStack>
        <YStack gap='$2'>
          {product.unitPriceCents === null ? null : (
            <MonoText size='$3'>
              {unitPrice(product.unitPriceCents, product.soldByWeight)}
            </MonoText>
          )}
          <Button
            variant='secondary'
            size='$3'
            onPress={onAdd}
            icon={<Plus size={16} color={brandColors.primaryText} />}
            accessibilityLabel={`Add ${productName(product.name)}`}
          >
            <ButtonText variant='secondary'>Add</ButtonText>
          </Button>
        </YStack>
      </YStack>
    </Card>
  )
}
