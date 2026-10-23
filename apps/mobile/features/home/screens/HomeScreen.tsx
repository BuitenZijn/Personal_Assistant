import React from 'react'
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
  ProgressMeter,
  Skeleton,
  Spinner,
  Text,
  XStack,
  YStack,
  neutralColors,
} from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import type { FunctionReturnType } from 'convex/server'
import { CalendarDays, ChefHat } from 'lucide-react-native'
import type { MainStackParamList } from '../../../navigation/types'
import { AppShell } from '../../../components/shell'
import { EmptyState, emptyStateIconColor } from '../../../components/kit'
import { useQueryState } from '../../../lib/convex'
import { convexErrorData } from '../../../lib/convexErrors'
import { useHousehold } from '../../household/useHousehold'
import { SuggestionCard } from '../components/SuggestionCard'
import { dayMonth, dinners, people } from '../format'

type NavigationProp = StackNavigationProp<MainStackParamList>
type Plan = NonNullable<
  FunctionReturnType<typeof api.functions.mealPlans.current>
>

/** A run with no progress for this long has stalled. */
const STALLED_AFTER_MS = 10 * 60 * 1000

function showError(title: string, error: unknown) {
  Alert.alert(
    title,
    convexErrorData(error)?.message ?? 'Check your connection and try again.',
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  const tabBarHeight = useBottomTabBarHeight()
  return (
    <AppShell title='Meal plan' showBack={false}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          gap: 16,
          paddingBottom: tabBarHeight + 40,
        }}
      >
        {children}
      </ScrollView>
    </AppShell>
  )
}

function Progress({ plan, onRestart }: { plan: Plan; onRestart: () => void }) {
  const p = plan.progress
  let text = 'Looking through colruyt.be’s recipes for dinners that suit you…'
  let value = 8
  if (p?.step === 'reading') {
    text = `Reading the recipes: ${p.done} of ${p.total}`
    value = 10 + (p.total ? (p.done / p.total) * 80 : 0)
  } else if (p?.step === 'choosing') {
    text = 'Choosing the ones that suit everyone…'
    value = 95
  }
  const stalled = Date.now() - plan.updatedAt > STALLED_AFTER_MS
  return (
    <Card padding='$4'>
      <YStack gap='$3'>
        <XStack alignItems='center' gap='$3'>
          <Spinner size='small' />
          <Text size='$4' weight='semibold' flex={1}>
            Finding your dinners
          </Text>
        </XStack>
        <Text size='$3' variant='muted'>
          {text}
        </Text>
        <ProgressMeter value={value} />
        <Text size='$2' variant='muted'>
          This takes a few minutes: we read one recipe page every few seconds.
          You can close the app in the meantime.
        </Text>
        {stalled ? <LinkText onPress={onRestart}>Start again</LinkText> : null}
      </YStack>
    </Card>
  )
}

/** What the Claude calls behind these suggestions cost, in US dollars. */
function ClaudeCost({ plan }: { plan: Plan }) {
  if (!plan.claudeCostUsd) return null
  return (
    <XStack justifyContent='center' alignItems='baseline' gap='$1'>
      <Text size='$2' variant='muted'>
        {plan.status === 'suggesting' ? 'Claude cost so far' : 'Claude cost'}
      </Text>
      <MonoText size='$2' variant='muted'>
        ${plan.claudeCostUsd.toFixed(4)}
      </MonoText>
    </XStack>
  )
}

/**
 * The week's dinners: suggest them, pick the ones you want, confirm. Every
 * household member sees and changes the same plan.
 */
export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>()
  const plan = useQueryState(api.functions.mealPlans.current)
  const household = useHousehold()
  const suggest = useMutation(api.functions.mealPlans.suggest)
  const setPicked = useMutation(api.functions.mealPlans.setPicked)
  const setServings = useMutation(api.functions.mealPlans.setServings)
  const replace = useMutation(api.functions.mealPlans.replace)
  const confirm = useMutation(api.functions.mealPlans.confirm)
  const reopen = useMutation(api.functions.mealPlans.reopen)

  const startSuggesting = () =>
    void suggest().catch(error =>
      showError("We couldn't start the suggestions", error),
    )
  const planAgain = () =>
    Alert.alert(
      'Plan again?',
      'You get new suggestions; the ones you see now are set aside.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Plan again', onPress: startSuggesting },
      ],
    )
  const openRecipe = (recipeId: string) =>
    navigation.navigate('Recipe', { recipeId })

  if (plan.status === 'loading' || household.status === 'loading') {
    return (
      <Screen>
        <Skeleton height={28} width='60%' />
        <Skeleton height={140} radius={10} />
        <Skeleton height={140} radius={10} />
      </Screen>
    )
  }

  const dinnersPerWeek = household.data?.household.dinnersPerWeek ?? 5
  const data = plan.data

  if (!data) {
    return (
      <AppShell title='Meal plan' showBack={false}>
        <EmptyState
          icon={<CalendarDays size={30} color={emptyStateIconColor} />}
          title='Plan your dinners'
          description={`We suggest dinners from colruyt.be that suit your household, and you pick ${dinners(dinnersPerWeek)} for the week.`}
          action={
            <Button variant='primary' onPress={startSuggesting}>
              <ButtonText variant='cta'>Suggest dinners</ButtonText>
            </Button>
          }
        />
      </AppShell>
    )
  }

  const week = `Week of ${dayMonth(data.weekStart)}`

  if (data.status === 'suggesting') {
    return (
      <Screen>
        <Text size='$6' weight='semibold'>
          {week}
        </Text>
        <Progress plan={data} onRestart={startSuggesting} />
        <ClaudeCost plan={data} />
      </Screen>
    )
  }

  if (data.status === 'failed') {
    return (
      <Screen>
        <Text size='$6' weight='semibold'>
          {week}
        </Text>
        <InfoCard variant='error'>
          <InfoCardText variant='error'>
            {data.error ?? "We couldn't finish the suggestions."}
          </InfoCardText>
        </InfoCard>
        <Button variant='primary' onPress={startSuggesting}>
          <ButtonText variant='cta'>Try again</ButtonText>
        </Button>
        <ClaudeCost plan={data} />
      </Screen>
    )
  }

  const picked = data.suggestions.filter(s => s.picked)

  if (data.status === 'confirmed') {
    return (
      <Screen>
        <YStack gap='$1'>
          <Text size='$6' weight='semibold'>
            Your dinners
          </Text>
          <Text size='$3' variant='muted'>
            {week} · {dinners(picked.length)}
          </Text>
        </YStack>
        {picked.map(s => (
          <Card
            key={s.recipeId}
            interactive
            padding='$4'
            onPress={() => openRecipe(s.recipeId)}
          >
            <XStack alignItems='center' gap='$3'>
              <ChefHat size={20} color={neutralColors.text.secondary} />
              <YStack flex={1}>
                <Text size='$4' weight='medium'>
                  {s.title}
                </Text>
                <Text size='$2' variant='muted'>
                  For {people(s.servings)}
                </Text>
              </YStack>
            </XStack>
          </Card>
        ))}
        <Button
          variant='secondary'
          onPress={() =>
            void reopen({ planId: data._id }).catch(error =>
              showError("We couldn't reopen the plan", error),
            )
          }
        >
          <ButtonText variant='secondary'>Change my picks</ButtonText>
        </Button>
        <YStack alignItems='center'>
          <LinkText onPress={planAgain}>Plan again from scratch</LinkText>
        </YStack>
        <ClaudeCost plan={data} />
      </Screen>
    )
  }

  // Choosing.
  return (
    <Screen>
      <YStack gap='$1'>
        <Text size='$6' weight='semibold'>
          Pick your dinners
        </Text>
        <Text size='$3' variant='muted'>
          {week} · {picked.length} of {dinners(dinnersPerWeek)} picked
        </Text>
      </YStack>

      {data.note ? (
        <InfoCard variant='info'>
          <InfoCardText variant='info'>{data.note}</InfoCardText>
        </InfoCard>
      ) : null}

      {data.suggestions.length > 0 ? (
        <MicroLabel paddingHorizontal='$1'>Tap a dinner to pick it</MicroLabel>
      ) : null}
      {data.suggestions.map((s, index) => (
        <SuggestionCard
          key={`${s.recipeId}-${index}`}
          suggestion={s}
          onTogglePick={() =>
            void setPicked({
              planId: data._id,
              index,
              picked: !s.picked,
            }).catch(error => showError("We couldn't pick this", error))
          }
          onServings={servings =>
            void setServings({ planId: data._id, index, servings }).catch(
              error => showError("We couldn't change the servings", error),
            )
          }
          onOpen={() => openRecipe(s.recipeId)}
          onReplace={
            data.sparesLeft > 0
              ? () =>
                  void replace({ planId: data._id, index }).catch(error =>
                    showError("We couldn't replace this", error),
                  )
              : undefined
          }
        />
      ))}

      {data.suggestions.length > 0 ? (
        <Button
          variant='primary'
          size='$5'
          disabled={picked.length === 0}
          onPress={() =>
            void confirm({ planId: data._id }).catch(error =>
              showError("We couldn't confirm the plan", error),
            )
          }
        >
          <ButtonText variant='cta'>
            {picked.length === 0
              ? 'Pick your dinners'
              : `Confirm ${dinners(picked.length)}`}
          </ButtonText>
        </Button>
      ) : (
        <Button variant='primary' onPress={startSuggesting}>
          <ButtonText variant='cta'>Try again</ButtonText>
        </Button>
      )}
      {data.suggestions.length > 0 ? (
        <YStack alignItems='center'>
          <LinkText onPress={planAgain}>Plan again</LinkText>
        </YStack>
      ) : null}
      <ClaudeCost plan={data} />
    </Screen>
  )
}
