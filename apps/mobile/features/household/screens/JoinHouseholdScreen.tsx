import React, { useState } from 'react'
import { Alert } from 'react-native'
import { Card, InfoCard, InfoCardText, StyledInput, Text } from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { convexErrorData } from '../../../lib/convexErrors'
import { Field, FormScreen, SaveButton } from '../../../components/kit'
import { useHousehold } from '../useHousehold'

/**
 * Join the household someone invited you to, with the code from the invite.
 * You leave your current household.
 */
export function JoinHouseholdScreen() {
  const navigation = useNavigation()
  const household = useHousehold()
  const join = useMutation(api.functions.households.join)
  const [code, setCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const current = household.data
  const aloneInCurrent = (current?.members.length ?? 0) <= 1

  const handleJoin = async () => {
    setIsJoining(true)
    try {
      await join({ code })
      navigation.goBack()
    } catch (error) {
      Alert.alert(
        "We couldn't add you",
        convexErrorData(error)?.message ??
          'Check your connection and try again.',
      )
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <FormScreen title='Join a household'>
      <Text variant='muted'>
        Got an invite? Enter its code to plan and shop together. It works with
        the email address the invite was sent to.
      </Text>

      <Card padding='$4'>
        <Field label='Invite code'>
          <StyledInput
            value={code}
            onChangeText={setCode}
            placeholder='ABCD2345'
            autoCapitalize='characters'
            autoCorrect={false}
            size='$4'
            autoFocus
          />
        </Field>
      </Card>

      {current ? (
        <InfoCard variant='warning'>
          <InfoCardText variant='warning'>
            {aloneInCurrent
              ? `You'll leave ${current.household.name}, and its profile is deleted.`
              : `You'll leave ${current.household.name}. The others stay in it.`}
          </InfoCardText>
        </InfoCard>
      ) : null}

      <SaveButton
        label='Join household'
        busyLabel='Joining…'
        busy={isJoining}
        disabled={!code.trim()}
        onPress={handleJoin}
      />
    </FormScreen>
  )
}
