import React from 'react'
import { ScrollView } from 'react-native'
import {
  Button,
  ButtonText,
  Card,
  LinkText,
  MicroLabel,
  Skeleton,
  StatusChip,
  Text,
  XStack,
  YStack,
  brandColors,
  neutralColors,
} from '@pa/ui'
import { formatEuro } from '@pa/shared'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { ChevronRight, Mail, UserPlus, X } from 'lucide-react-native'
import type { MainStackParamList } from '../../../navigation/types'
import { AppShell } from '../../../components/shell'
import { dietLabel } from '../form'
import {
  type HouseholdData,
  type HouseholdPerson,
  useHousehold,
} from '../useHousehold'

type NavigationProp = StackNavigationProp<MainStackParamList>

const DAY_MS = 24 * 60 * 60 * 1000

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <YStack gap='$3'>
      <MicroLabel paddingHorizontal='$1'>{label}</MicroLabel>
      {children}
    </YStack>
  )
}

function personSummary(person: HouseholdPerson): string[] {
  const diet = dietLabel(person.diet)
  const lines = [
    person.age === undefined ? diet : `${diet} · ${person.age} years`,
  ]
  if (person.allergies.length) {
    lines.push(`Allergic to ${person.allergies.join(', ')}`)
  }
  if (person.dislikes.length) {
    lines.push(`Doesn't like ${person.dislikes.join(', ')}`)
  }
  return lines
}

function PersonCard({
  person,
  onPress,
}: {
  person: HouseholdPerson
  onPress: () => void
}) {
  return (
    <Card interactive padding='$4' onPress={onPress}>
      <XStack alignItems='center' gap='$3'>
        <YStack flex={1} gap='$1'>
          <Text size='$4' weight='semibold'>
            {person.name}
          </Text>
          {personSummary(person).map(line => (
            <Text key={line} size='$3' variant='muted'>
              {line}
            </Text>
          ))}
        </YStack>
        <ChevronRight size={18} color={neutralColors.text.muted} />
      </XStack>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent='space-between' gap='$3'>
      <Text size='$3' variant='muted'>
        {label}
      </Text>
      <Text size='$3' flexShrink={1} textAlign='right'>
        {value}
      </Text>
    </XStack>
  )
}

function DinnersCard({
  household,
  onPress,
}: {
  household: HouseholdData['household']
  onPress: () => void
}) {
  const { weekday, weekend } = household.cookingMinutes
  return (
    <Card interactive padding='$4' onPress={onPress}>
      <XStack alignItems='center' gap='$3'>
        <YStack flex={1} gap='$2'>
          <Row
            label='Dinners a week'
            value={String(household.dinnersPerWeek)}
          />
          <Row
            label='Cooking time'
            value={`${weekday} min weekdays, ${weekend} min weekends`}
          />
          <Row
            label='Budget'
            value={
              household.budgetPerWeekCents === undefined
                ? 'No budget'
                : `${formatEuro(household.budgetPerWeekCents / 100)} a week`
            }
          />
          <Row
            label='Cuisines'
            value={
              household.cuisines.length
                ? household.cuisines.join(', ')
                : 'Anything'
            }
          />
          {household.lessMeat ? <Row label='Meat' value='Less meat' /> : null}
        </YStack>
        <ChevronRight size={18} color={neutralColors.text.muted} />
      </XStack>
    </Card>
  )
}

function MembersCard({ data }: { data: HouseholdData }) {
  const cancelInvite = useMutation(api.functions.households.cancelInvite)
  const now = Date.now()
  return (
    <Card padding='$4'>
      <YStack gap='$3'>
        {data.members.map(member => (
          <XStack key={member.userId} alignItems='center' gap='$2'>
            <YStack flex={1}>
              <Text size='$4' weight='medium'>
                {member.isMe ? `${member.name} (you)` : member.name}
              </Text>
              {member.email ? (
                <Text size='$2' variant='muted'>
                  {member.email}
                </Text>
              ) : null}
            </YStack>
            {member.role === 'owner' ? <StatusChip label='Owner' /> : null}
          </XStack>
        ))}
        {data.invites.map(invite => {
          const daysLeft = Math.ceil((invite.expiresAt - now) / DAY_MS)
          return (
            <XStack key={invite._id} alignItems='center' gap='$2'>
              <Mail size={18} color={neutralColors.text.secondary} />
              <YStack flex={1}>
                <Text size='$3'>{invite.email}</Text>
                <Text size='$2' variant='muted'>
                  {daysLeft > 0
                    ? `Invited · code ${invite.code} · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
                    : 'Invite expired'}
                </Text>
              </YStack>
              <Button
                variant='ghost'
                size='$3'
                circular
                onPress={() => void cancelInvite({ inviteId: invite._id })}
                accessibilityLabel={`Cancel the invite for ${invite.email}`}
                icon={<X size={18} color={neutralColors.text.muted} />}
              />
            </XStack>
          )
        })}
      </YStack>
    </Card>
  )
}

function LoadingHousehold() {
  return (
    <YStack padding='$4' gap='$3'>
      <Skeleton height={28} width='60%' />
      <Skeleton height={88} radius={10} />
      <Skeleton height={88} radius={10} />
      <Skeleton height={140} radius={10} />
    </YStack>
  )
}

/**
 * Your household: the people we cook for, what dinners should be like, and
 * who shares the app with you. Every member sees and edits the same profile.
 */
export function HouseholdScreen() {
  const navigation = useNavigation<NavigationProp>()
  const tabBarHeight = useBottomTabBarHeight()
  const state = useHousehold()

  // Null while the first-sign-in set-up runs (see useEnsureHousehold).
  if (state.status === 'loading' || state.data === null) {
    return (
      <AppShell title='Household' showBack={false}>
        <LoadingHousehold />
      </AppShell>
    )
  }

  const data = state.data
  const { household } = data

  return (
    <AppShell title='Household' showBack={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}>
        <YStack padding='$4' gap='$6'>
          <Text size='$6' weight='semibold'>
            {household.name}
          </Text>

          <Section label='Who we cook for'>
            {household.people.length === 0 ? (
              <Text variant='muted'>
                Add the people you cook for, so we can plan dinners everyone
                eats.
              </Text>
            ) : (
              household.people.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onPress={() =>
                    navigation.navigate('Person', { personId: person.id })
                  }
                />
              ))
            )}
            <Button
              variant='secondary'
              onPress={() => navigation.navigate('Person', {})}
              icon={<UserPlus size={18} color={brandColors.primaryText} />}
            >
              <ButtonText variant='secondary'>Add a person</ButtonText>
            </Button>
          </Section>

          <Section label='Dinners'>
            <DinnersCard
              household={household}
              onPress={() => navigation.navigate('HouseholdSettings')}
            />
          </Section>

          <Section label='Shared with'>
            <MembersCard data={data} />
            <Button
              variant='secondary'
              onPress={() => navigation.navigate('Invite')}
              icon={<Mail size={18} color={brandColors.primaryText} />}
            >
              <ButtonText variant='secondary'>Invite someone</ButtonText>
            </Button>
          </Section>

          <YStack alignItems='center'>
            <LinkText onPress={() => navigation.navigate('JoinHousehold')}>
              Got an invite code? Join a household
            </LinkText>
          </YStack>
        </YStack>
      </ScrollView>
    </AppShell>
  )
}
