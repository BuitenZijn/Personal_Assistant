import React, { useState } from 'react'
import { Alert, ScrollView } from 'react-native'
import {
  Button,
  ButtonText,
  Card,
  InfoCard,
  InfoCardText,
  LinkText,
  MicroLabel,
  MonoText,
  SegmentedControl,
  Skeleton,
  Spinner,
  Text,
  XStack,
  YStack,
  neutralColors,
} from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import type { FunctionReturnType } from 'convex/server'
import { formatEuro } from '@pa/shared'
import type { MainTabParamList } from '../../../navigation/types'
import { AppShell } from '../../../components/shell'
import { useQueryState } from '../../../lib/convex'
import { convexErrorData } from '../../../lib/convexErrors'
import { dayMonth, dinners } from '../../home/format'
import {
  RECOMMENDATION_WIDTH,
  RecommendationCard,
} from '../components/RecommendationCard'
import { ShoppingLineRow } from '../components/ShoppingLineRow'
import { WEBSHOPS, products, type Webshop } from '../format'

type Current = NonNullable<
  FunctionReturnType<typeof api.functions.shoppingLists.current>
>

/** A build with no news for this long has stalled. */
const STALLED_AFTER_MS = 10 * 60 * 1000

function showError(title: string, error: unknown) {
  Alert.alert(
    title,
    convexErrorData(error)?.message ?? 'Check your connection and try again.',
  )
}

/** The week's dinners → products: the button, or where things stand. */
function FromMealPlan({
  current,
  onBuild,
  onOpenMealPlan,
}: {
  current: Current
  onBuild: () => void
  onOpenMealPlan: () => void
}) {
  const { plan, list } = current
  const built = list?.lines.some(l => l.reason === 'recipe') ?? false
  const stalled = list ? Date.now() - list.updatedAt > STALLED_AFTER_MS : false

  if (list?.status === 'building') {
    return (
      <Card padding='$4'>
        <YStack gap='$3'>
          <XStack alignItems='center' gap='$3'>
            <Spinner size='small' />
            <Text size='$4' weight='semibold' flex={1}>
              Making your shopping list
            </Text>
          </XStack>
          <Text size='$3' variant='muted'>
            We match the ingredients of your dinners to the products you buy.
            This takes a few seconds.
          </Text>
          {stalled ? <LinkText onPress={onBuild}>Start again</LinkText> : null}
        </YStack>
      </Card>
    )
  }

  return (
    <Card padding='$4'>
      <YStack gap='$3'>
        <Text size='$4' weight='semibold'>
          Your dinners for the week of {dayMonth(current.weekStart)}
        </Text>
        {plan?.status === 'confirmed' ? (
          <>
            <Text size='$3' variant='muted'>
              {built
                ? 'Changed your dinners? Update the list; products you added stay.'
                : `Turn your ${dinners(plan.dinners)} into the products you usually buy.`}
            </Text>
            <Button variant={built ? 'secondary' : 'primary'} onPress={onBuild}>
              <ButtonText variant={built ? 'secondary' : 'cta'}>
                {built ? 'Update from meal plan' : 'Make shopping list'}
              </ButtonText>
            </Button>
          </>
        ) : (
          <>
            <Text size='$3' variant='muted'>
              Confirm this week’s dinners first, then turn them into a shopping
              list here.
            </Text>
            <LinkText onPress={onOpenMealPlan}>Go to meal plan</LinkText>
          </>
        )}
        {list?.status === 'failed' && list.error ? (
          <InfoCard variant='error'>
            <InfoCardText>{list.error}</InfoCardText>
          </InfoCard>
        ) : null}
      </YStack>
    </Card>
  )
}

/** Products they're about to run out of, going by their receipts. */
function Recommendations() {
  const recommendations = useQueryState(
    api.functions.shoppingLists.recommendations,
  )
  const addProduct = useMutation(api.functions.shoppingLists.addProduct)
  const items = recommendations.data ?? []

  return (
    <YStack gap='$2'>
      <MicroLabel paddingHorizontal='$1'>You might be running out</MicroLabel>
      {recommendations.status === 'loading' ? (
        <XStack gap='$3'>
          <Skeleton height={150} width={RECOMMENDATION_WIDTH} radius={10} />
          <Skeleton height={150} width={RECOMMENDATION_WIDTH} radius={10} />
        </XStack>
      ) : items.length === 0 ? (
        <Text size='$3' variant='muted' paddingHorizontal='$1'>
          Nothing due right now. We look at how often you buy things on your
          receipts.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Let the cards run to the screen edge, and their shadow show.
          style={{ marginHorizontal: -16 }}
          contentContainerStyle={{
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}
        >
          {items.map(product => (
            <RecommendationCard
              key={product.productId}
              product={product}
              onAdd={() =>
                void addProduct({ productId: product.productId }).catch(error =>
                  showError("We couldn't add this", error),
                )
              }
            />
          ))}
        </ScrollView>
      )}
    </YStack>
  )
}

function ShoppingList({ list }: { list: Current['list'] }) {
  const setQuantity = useMutation(api.functions.shoppingLists.setQuantity)
  const removeLine = useMutation(api.functions.shoppingLists.removeLine)

  if (!list || list.lines.length === 0) {
    return (
      <Text size='$3' variant='muted' paddingHorizontal='$1'>
        Your list is empty. Make it from your meal plan, or add products you
        might be running out of.
      </Text>
    )
  }
  return (
    <Card paddingHorizontal='$4' paddingVertical='$1'>
      {list.lines.map((line, i) => (
        <YStack
          key={line.id}
          borderTopWidth={i === 0 ? 0 : 1}
          borderTopColor={neutralColors.border.subtle}
        >
          <ShoppingLineRow
            line={line}
            onQuantity={quantity =>
              void setQuantity({ lineId: line.id, quantity }).catch(error =>
                showError("We couldn't change this", error),
              )
            }
            onRemove={() =>
              void removeLine({ lineId: line.id }).catch(error =>
                showError("We couldn't remove this", error),
              )
            }
          />
        </YStack>
      ))}
      <XStack
        justifyContent='space-between'
        alignItems='baseline'
        paddingVertical='$3'
        borderTopWidth={1}
        borderTopColor={neutralColors.border.subtle}
      >
        <YStack gap='$1'>
          <Text size='$4' weight='semibold'>
            Estimate
          </Text>
          {list.unpriced > 0 ? (
            <Text size='$2' variant='muted'>
              Leaves out {products(list.unpriced)} without a price
            </Text>
          ) : null}
        </YStack>
        <MonoText size='$5'>{formatEuro(list.estimateCents / 100)}</MonoText>
      </XStack>
    </Card>
  )
}

/** Where the list will be ordered. Only the choice for now; see Phase 6. */
function OrderOnline() {
  const [webshop, setWebshop] = useState<Webshop>('collect-and-go')
  const label = WEBSHOPS.find(w => w.value === webshop)!.label
  return (
    <Card padding='$4'>
      <YStack gap='$3'>
        <Text size='$4' weight='semibold'>
          Order online
        </Text>
        <SegmentedControl
          items={WEBSHOPS.map(w => ({ value: w.value, label: w.label }))}
          value={webshop}
          onChange={setWebshop}
          stretch
          ariaLabel='Webshop'
        />
        <Button variant='secondary' disabled>
          <ButtonText variant='secondary'>Order at {label}</ButtonText>
        </Button>
        <Text size='$2' variant='muted'>
          Coming soon: we’ll put your whole list in the webshop you choose.
        </Text>
      </YStack>
    </Card>
  )
}

/**
 * Shopping for the week: the confirmed dinners turned into products, what
 * they might be running out of, and (later) ordering it all online.
 */
export function ShopScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>()
  const tabBarHeight = useBottomTabBarHeight()
  const current = useQueryState(api.functions.shoppingLists.current)
  const build = useMutation(api.functions.shoppingLists.build)

  const data = current.data
  return (
    <AppShell title='Shop' showBack={false}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 24,
          paddingBottom: tabBarHeight + 40,
        }}
      >
        {current.status === 'loading' || !data ? (
          <YStack gap='$3'>
            <Skeleton height={140} radius={10} />
            <Skeleton height={150} radius={10} />
          </YStack>
        ) : (
          <>
            <FromMealPlan
              current={data}
              onBuild={() =>
                void build().catch(error =>
                  showError("We couldn't make the list", error),
                )
              }
              onOpenMealPlan={() =>
                navigation.navigate('HomeTab', { screen: 'Home' })
              }
            />
            <Recommendations />
            <YStack gap='$2'>
              <XStack
                justifyContent='space-between'
                alignItems='baseline'
                paddingHorizontal='$1'
              >
                <MicroLabel>Your shopping list</MicroLabel>
                {data.list?.lines.length ? (
                  <Text size='$2' variant='muted'>
                    {products(data.list.lines.length)}
                  </Text>
                ) : null}
              </XStack>
              <ShoppingList list={data.list} />
            </YStack>
            {data.list?.pantry.length ? (
              <YStack gap='$2'>
                <MicroLabel paddingHorizontal='$1'>Check you have</MicroLabel>
                <Card padding='$4'>
                  <Text size='$3' variant='muted'>
                    {data.list.pantry.join(', ')}
                  </Text>
                </Card>
              </YStack>
            ) : null}
            {data.list?.claudeCostUsd ? (
              <XStack justifyContent='center' alignItems='baseline' gap='$1'>
                <Text size='$2' variant='muted'>
                  Claude cost
                </Text>
                <MonoText size='$2' variant='muted'>
                  ${data.list.claudeCostUsd.toFixed(4)}
                </MonoText>
              </XStack>
            ) : null}
            <OrderOnline />
          </>
        )}
      </ScrollView>
    </AppShell>
  )
}
