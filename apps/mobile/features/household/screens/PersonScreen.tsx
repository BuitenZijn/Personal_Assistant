import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import {
  Button,
  ButtonText,
  Card,
  SegmentedControl,
  StyledInput,
  semanticColors,
  YStack,
} from '@pa/ui'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { Trash2 } from 'lucide-react-native'
import type { HouseholdStackParamList } from '../../../navigation/types'
import {
  ActionConfirmModal,
  Field,
  FormScreen,
  SaveButton,
} from '../../../components/kit'
import { convexErrorData } from '../../../lib/convexErrors'
import {
  type Diet,
  DIET_OPTIONS,
  joinList,
  parseWholeNumber,
  splitList,
} from '../form'
import { useHousehold } from '../useHousehold'

/**
 * Add someone we cook for, or with `personId`, change or remove them.
 */
export function PersonScreen() {
  const navigation = useNavigation()
  const { params } = useRoute<RouteProp<HouseholdStackParamList, 'Person'>>()
  const personId = params?.personId
  const household = useHousehold()
  const savePerson = useMutation(api.functions.households.savePerson)
  const removePerson = useMutation(api.functions.households.removePerson)

  const person = household.data?.household.people.find(p => p.id === personId)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [diet, setDiet] = useState<Diet>('everything')
  const [allergies, setAllergies] = useState('')
  const [dislikes, setDislikes] = useState('')
  const [initialized, setInitialized] = useState(!personId)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Fill in the person once the query resolves.
  useEffect(() => {
    if (person && !initialized) {
      setName(person.name)
      setAge(person.age === undefined ? '' : String(person.age))
      setDiet(person.diet)
      setAllergies(joinList(person.allergies))
      setDislikes(joinList(person.dislikes))
      setInitialized(true)
    }
  }, [person, initialized])

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Add a name', 'Enter a name so you know who this is.')
      return
    }
    const parsedAge = parseWholeNumber(age)
    if (age.trim() && parsedAge === null) {
      Alert.alert('Check the age', 'Enter the age as a whole number.')
      return
    }
    setIsSaving(true)
    try {
      await savePerson({
        id: personId,
        name,
        age: parsedAge,
        diet,
        allergies: splitList(allergies),
        dislikes: splitList(dislikes),
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

  const handleRemove = async () => {
    setConfirmRemove(false)
    if (!personId) return
    try {
      await removePerson({ id: personId })
      navigation.goBack()
    } catch {
      Alert.alert(
        "We couldn't remove this person",
        'Check your connection and try again.',
      )
    }
  }

  return (
    <FormScreen title={personId ? 'Edit person' : 'Add a person'}>
      <Card padding='$4'>
        <YStack gap='$4'>
          <Field label='Name'>
            <StyledInput
              value={name}
              onChangeText={setName}
              placeholder='Who do you cook for?'
              size='$4'
              autoFocus={!personId}
            />
          </Field>
          <Field label='Age' hint='Optional. Helps us pick portions.'>
            <StyledInput
              value={age}
              onChangeText={setAge}
              placeholder='Age in years'
              keyboardType='number-pad'
              size='$4'
            />
          </Field>
          <Field label='Eats'>
            <SegmentedControl
              items={DIET_OPTIONS}
              value={diet}
              onChange={setDiet}
              stretch
              ariaLabel='Diet'
            />
          </Field>
          <Field label='Allergies' hint='Separate them with commas.'>
            <StyledInput
              value={allergies}
              onChangeText={setAllergies}
              placeholder='Nuts, shellfish'
              size='$4'
            />
          </Field>
          <Field label="Doesn't like" hint='Separate them with commas.'>
            <StyledInput
              value={dislikes}
              onChangeText={setDislikes}
              placeholder='Olives, mushrooms'
              size='$4'
            />
          </Field>
        </YStack>
      </Card>

      <SaveButton
        label={personId ? 'Save changes' : 'Add person'}
        busyLabel='Saving…'
        busy={isSaving}
        disabled={!initialized}
        onPress={handleSave}
      />

      {personId ? (
        <Button variant='danger' onPress={() => setConfirmRemove(true)}>
          <ButtonText>Remove from household</ButtonText>
        </Button>
      ) : null}

      <ActionConfirmModal
        visible={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        icon={<Trash2 size={24} color={semanticColors.error.main} />}
        title={`Remove ${person?.name ?? 'this person'}?`}
        description="We won't plan dinners for them any more."
        confirmLabel='Remove'
      />
    </FormScreen>
  )
}
