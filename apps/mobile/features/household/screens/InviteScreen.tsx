import React, { useState } from 'react'
import { Alert, Share } from 'react-native'
import {
  Button,
  ButtonText,
  Card,
  InfoCard,
  InfoCardText,
  MonoText,
  StyledInput,
  Text,
  YStack,
  brandColors,
} from '@pa/ui'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { Share2 } from 'lucide-react-native'
import { convexErrorData } from '../../../lib/convexErrors'
import { Field, FormScreen, SaveButton } from '../../../components/kit'
import { useHousehold } from '../useHousehold'

type Sent = { email: string; code: string; emailed: boolean }

/** The message someone shares when the code wasn't (or also wasn't) emailed. */
export function inviteMessage({
  householdName,
  email,
  code,
}: {
  householdName: string
  email: string
  code: string
}) {
  return `Join ${householdName} in Personal Assistant: sign up or sign in with ${email}, go to Household, tap "Join a household" and enter the code ${code}. It works for 14 days.`
}

/**
 * Invite someone to the household by email. They join with the code, from an
 * account with that address.
 */
export function InviteScreen() {
  const household = useHousehold()
  const invite = useMutation(api.functions.households.invite)
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState<Sent | null>(null)

  const householdName = household.data?.household.name ?? 'our household'

  const handleInvite = async () => {
    setIsSending(true)
    try {
      const result = await invite({ email })
      setSent({ email: email.trim().toLowerCase(), ...result })
      setEmail('')
    } catch (error) {
      Alert.alert(
        "We couldn't create the invite",
        convexErrorData(error)?.message ??
          'Check your connection and try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleShare = (invited: Sent) => {
    void Share.share({ message: inviteMessage({ householdName, ...invited }) })
  }

  return (
    <FormScreen title='Invite someone'>
      <Text variant='muted'>
        Plan dinners and shop together. Everyone in {householdName} sees and
        edits the same profile and plans.
      </Text>

      {sent ? (
        <InfoCard variant='success'>
          <YStack gap='$3'>
            <InfoCardText variant='success'>
              {sent.emailed
                ? `We emailed ${sent.email} an invite. You can also share the code yourself:`
                : `Share this code with ${sent.email}. They sign in with that address and enter it under Household:`}
            </InfoCardText>
            <MonoText size='$7' textAlign='center'>
              {sent.code}
            </MonoText>
            <Button
              variant='secondary'
              onPress={() => handleShare(sent)}
              icon={<Share2 size={18} color={brandColors.primaryText} />}
            >
              <ButtonText variant='secondary'>Share code</ButtonText>
            </Button>
          </YStack>
        </InfoCard>
      ) : null}

      <Card padding='$4'>
        <Field label='Their email address'>
          <StyledInput
            value={email}
            onChangeText={setEmail}
            placeholder='name@example.com'
            keyboardType='email-address'
            autoCapitalize='none'
            autoCorrect={false}
            autoComplete='email'
            size='$4'
            autoFocus
          />
        </Field>
      </Card>

      <SaveButton
        label={sent ? 'Invite someone else' : 'Create invite'}
        busyLabel='Creating…'
        busy={isSending}
        disabled={!email.trim()}
        onPress={handleInvite}
      />
    </FormScreen>
  )
}
