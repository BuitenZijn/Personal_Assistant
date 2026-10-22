import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import {
  Card,
  Checkbox,
  SegmentedControl,
  StyledInput,
  Text,
  XStack,
  YStack,
} from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { convexErrorData } from '../../../lib/convexErrors'
import { Field, FormScreen, SaveButton } from '../../../components/kit'
import {
  centsToInput,
  joinList,
  parseEuroCents,
  parseWholeNumber,
  splitList,
} from '../form'
import { useHousehold } from '../useHousehold'

const DINNER_COUNTS = ['1', '2', '3', '4', '5', '6', '7'] as const
type DinnerCount = (typeof DINNER_COUNTS)[number]

/** A number field with its unit after it ("30 min", "€ 120"). */
function UnitInput({
  value,
  onChangeText,
  unit,
  unitFirst,
  placeholder,
  keyboardType = 'number-pad',
}: {
  value: string
  onChangeText: (text: string) => void
  unit: string
  unitFirst?: boolean
  placeholder?: string
  keyboardType?: 'number-pad' | 'decimal-pad'
}) {
  const unitText = (
    <Text size='$3' variant='muted'>
      {unit}
    </Text>
  )
  return (
    <XStack alignItems='center' gap='$2'>
      {unitFirst ? unitText : null}
      <StyledInput
        flex={1}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        size='$4'
      />
      {unitFirst ? null : unitText}
    </XStack>
  )
}

/**
 * The household's name and what every weekly plan is made for: how many
 * dinners, how long we cook, the budget and the food we like.
 */
export function HouseholdSettingsScreen() {
  const navigation = useNavigation()
  const household = useHousehold()
  const updateSettings = useMutation(api.functions.households.updateSettings)

  const [name, setName] = useState('')
  const [dinners, setDinners] = useState<DinnerCount>('5')
  const [weekday, setWeekday] = useState('')
  const [weekend, setWeekend] = useState('')
  const [budget, setBudget] = useState('')
  const [cuisines, setCuisines] = useState('')
  const [lessMeat, setLessMeat] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const current = household.data?.household
  useEffect(() => {
    if (current && !initialized) {
      setName(current.name)
      setDinners(String(current.dinnersPerWeek) as DinnerCount)
      setWeekday(String(current.cookingMinutes.weekday))
      setWeekend(String(current.cookingMinutes.weekend))
      setBudget(
        current.budgetPerWeekCents === undefined
          ? ''
          : centsToInput(current.budgetPerWeekCents),
      )
      setCuisines(joinList(current.cuisines))
      setLessMeat(current.lessMeat)
      setInitialized(true)
    }
  }, [current, initialized])

  const handleSave = async () => {
    const weekdayMinutes = parseWholeNumber(weekday)
    const weekendMinutes = parseWholeNumber(weekend)
    if (weekdayMinutes === null || weekendMinutes === null) {
      Alert.alert(
        'Check the cooking time',
        'Enter the minutes as whole numbers.',
      )
      return
    }
    const budgetCents = parseEuroCents(budget)
    if (budget.trim() && budgetCents === null) {
      Alert.alert('Check the budget', 'Enter an amount like 120 or 120,50.')
      return
    }
    setIsSaving(true)
    try {
      await updateSettings({
        name,
        dinnersPerWeek: Number(dinners),
        cookingMinutes: { weekday: weekdayMinutes, weekend: weekendMinutes },
        budgetPerWeekCents: budgetCents,
        cuisines: splitList(cuisines),
        lessMeat,
      })
      navigation.goBack()
    } catch (error) {
      Alert.alert(
        "We couldn't save this",
        convexErrorData(error)?.message ??
          'Check your connection and try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormScreen title='Dinner preferences'>
      <Card padding='$4'>
        <YStack gap='$4'>
          <Field label='Household name'>
            <StyledInput
              value={name}
              onChangeText={setName}
              placeholder='The Peeters'
              size='$4'
            />
          </Field>
          <Field label='Dinners to plan each week'>
            <SegmentedControl
              items={DINNER_COUNTS.map(count => ({
                value: count,
                label: count,
              }))}
              value={dinners}
              onChange={setDinners}
              stretch
              ariaLabel='Dinners each week'
            />
          </Field>
        </YStack>
      </Card>

      <Card padding='$4'>
        <YStack gap='$4'>
          <Field label='Time to cook on weekdays'>
            <UnitInput value={weekday} onChangeText={setWeekday} unit='min' />
          </Field>
          <Field label='Time to cook at the weekend'>
            <UnitInput value={weekend} onChangeText={setWeekend} unit='min' />
          </Field>
          <Field
            label='Budget per week'
            hint='Optional. Leave it empty for no budget.'
          >
            <UnitInput
              value={budget}
              onChangeText={setBudget}
              unit='€'
              unitFirst
              placeholder='120'
              keyboardType='decimal-pad'
            />
          </Field>
        </YStack>
      </Card>

      <Card padding='$4'>
        <YStack gap='$4'>
          <Field
            label='Cuisines you like'
            hint='Separate them with commas. Leave it empty for anything.'
          >
            <StyledInput
              value={cuisines}
              onChangeText={setCuisines}
              placeholder='Italian, Thai, Belgian'
              size='$4'
            />
          </Field>
          <Checkbox
            checked={lessMeat}
            onCheckedChange={setLessMeat}
            label='We want to eat less meat'
          />
        </YStack>
      </Card>

      <SaveButton
        label='Save changes'
        busyLabel='Saving…'
        busy={isSaving}
        disabled={!initialized}
        onPress={handleSave}
      />
    </FormScreen>
  )
}
