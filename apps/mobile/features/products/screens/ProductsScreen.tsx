import React, { useState } from 'react'
import { FlatList } from 'react-native'
import {
  Card,
  MonoText,
  Skeleton,
  StyledInput,
  Text,
  XStack,
  YStack,
  neutralColors,
} from '@pa/ui'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { api } from '@pa/backend/api'
import type { FunctionReturnType } from 'convex/server'
import { Receipt, Search } from 'lucide-react-native'
import { AppShell } from '../../../components/shell'
import { EmptyState, emptyStateIconColor } from '../../../components/kit'
import { useQueryState } from '../../../lib/convex'
import { useDebounced } from '../../../hooks/useDebounced'
import {
  dateRange,
  interval,
  productName,
  shortDate,
  timesBought,
  unitPrice,
} from '../format'

type ProductStat = FunctionReturnType<
  typeof api.functions.receipts.myProducts
>[number]

function ProductRow({ product }: { product: ProductStat }) {
  const year = new Date().getFullYear()
  const details = [
    timesBought(product.timesBought),
    `last on ${shortDate(product.lastBoughtOn, year)}`,
    product.averageIntervalDays === undefined
      ? null
      : `about ${interval(product.averageIntervalDays)}`,
  ].filter(Boolean)

  return (
    <Card padding='$3' paddingHorizontal='$4'>
      <XStack alignItems='center' gap='$3'>
        <YStack flex={1} gap='$1'>
          <Text size='$4' weight='medium' numberOfLines={2}>
            {productName(product.name)}
          </Text>
          <Text size='$2' variant='muted'>
            {details.join(' · ')}
          </Text>
        </YStack>
        {product.lastUnitPriceCents === undefined ? null : (
          <MonoText size='$3'>
            {unitPrice(product.lastUnitPriceCents, product.soldByWeight)}
          </MonoText>
        )}
      </XStack>
    </Card>
  )
}

function LoadingList() {
  return (
    <YStack gap='$3'>
      {[0, 1, 2, 3, 4].map(i => (
        <Skeleton key={i} height={64} radius={10} />
      ))}
    </YStack>
  )
}

/**
 * What the household buys, from its receipts: most often bought first, or
 * what matches a search.
 */
export function ProductsScreen() {
  const tabBarHeight = useBottomTabBarHeight()
  const [search, setSearch] = useState('')
  const term = useDebounced(search.trim(), 250)
  const summary = useQueryState(api.functions.receipts.summary)
  const products = useQueryState(
    api.functions.receipts.myProducts,
    term ? { search: term } : {},
  )

  const receiptCount = summary.data?.receiptCount ?? 0
  if (summary.status === 'ready' && receiptCount === 0) {
    return (
      <AppShell title='Products' showBack={false}>
        <EmptyState
          icon={<Receipt size={30} color={emptyStateIconColor} />}
          title='No receipts yet'
          description='Import your receipts from your computer to see what you buy most.'
        />
      </AppShell>
    )
  }

  const { firstDate, lastDate } = summary.data ?? {}
  return (
    <AppShell title='Products' showBack={false}>
      <FlatList
        data={products.data ?? []}
        keyExtractor={item => item._id}
        renderItem={({ item }) => <ProductRow product={item} />}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: tabBarHeight + 40,
        }}
        ListHeaderComponent={
          <YStack gap='$3' marginBottom='$1'>
            <XStack alignItems='center' gap='$2'>
              <YStack position='absolute' left='$3' zIndex={1}>
                <Search size={18} color={neutralColors.text.muted} />
              </YStack>
              <StyledInput
                flex={1}
                value={search}
                onChangeText={setSearch}
                placeholder='Search what you buy'
                autoCorrect={false}
                returnKeyType='search'
                paddingLeft={40}
                size='$4'
              />
            </XStack>
            {firstDate && lastDate ? (
              <Text size='$2' variant='muted'>
                From {receiptCount}{' '}
                {receiptCount === 1 ? 'receipt' : 'receipts'},{' '}
                {dateRange(firstDate, lastDate)}
              </Text>
            ) : null}
          </YStack>
        }
        ListEmptyComponent={
          products.status === 'loading' || summary.status === 'loading' ? (
            <LoadingList />
          ) : (
            <Text variant='muted' textAlign='center' paddingTop='$6'>
              Nothing you bought matches “{term}”.
            </Text>
          )
        }
      />
    </AppShell>
  )
}
