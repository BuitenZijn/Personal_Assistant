import React, { useState } from 'react'
import { ScrollView, Linking } from 'react-native'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import {
  Button,
  ButtonText,
  InfoCard,
  MicroLabel,
  neutralColors,
  semanticColors,
  Text,
  XStack,
  YStack,
} from '@pa/ui'
import { ShieldCheck, Trash2 } from 'lucide-react-native'
import { AppShell, ScreenHeader } from '../../../components/shell'
import { ActionConfirmModal } from '../../../components/kit'
import { SUPPORT_EMAIL } from '@pa/shared'

type ConfirmationStep = 'warning' | 'final' | null

export function AccountPrivacyScreen() {
  const { signOut } = useAuthActions()
  const deleteAccount = useMutation(api.functions.users.deleteAccount)
  const [confirmationStep, setConfirmationStep] =
    useState<ConfirmationStep>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)

  const handleConfirm = async () => {
    if (confirmationStep === 'warning') {
      setConfirmationStep('final')
      return
    }
    if (confirmationStep !== 'final' || isDeleting) return

    setConfirmationStep(null)
    setDeleteError(false)
    setIsDeleting(true)
    try {
      await deleteAccount()
      // The server has already ended every session; this clears the token
      // stored on this phone.
      await signOut().catch(() => {})
    } catch {
      setDeleteError(true)
      setIsDeleting(false)
    }
  }

  const isFinalStep = confirmationStep === 'final'

  return (
    <AppShell showHeader={false}>
      <ScreenHeader title='Account & privacy' />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack flex={1} padding='$4' paddingBottom='$8' gap='$6'>
          <YStack gap='$3'>
            <MicroLabel paddingHorizontal='$1'>JOUW ACCOUNT</MicroLabel>
            <InfoCard variant='info' size='$4'>
              <XStack gap='$3' alignItems='flex-start'>
                <ShieldCheck size={22} color={semanticColors.info.main} />
                <YStack flex={1} gap='$1'>
                  <Text weight='semibold' selectable>
                    Your data belongs to you
                  </Text>
                </YStack>
              </XStack>
            </InfoCard>
            <Button
              variant='ghost'
              onPress={() => {
                void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)
              }}
            >
              <ButtonText>Contacteer ons</ButtonText>
            </Button>
          </YStack>

          <YStack marginTop='auto' gap='$3'>
            <MicroLabel paddingHorizontal='$1'>ACCOUNT VERWIJDEREN</MicroLabel>
            <YStack gap='$1' paddingHorizontal='$1'>
              <Text weight='semibold' selectable>
                Delete account permanently
              </Text>
              <Text size='$2' variant='muted' selectable>
                Deletes your profile and all data that belongs to your account.
                This usually takes a few minutes and cannot be undone.
              </Text>
            </YStack>

            {deleteError && (
              <InfoCard
                variant='error'
                size='$3'
                accessibilityRole='alert'
                accessibilityLiveRegion='polite'
              >
                <Text size='$2' variant='error' selectable>
                  We couldn’t delete your account. Try again or email
                  {SUPPORT_EMAIL}.
                </Text>
              </InfoCard>
            )}

            <Button
              variant='outline-danger'
              onPress={() => setConfirmationStep('warning')}
              disabled={isDeleting}
              icon={<Trash2 size={18} color={semanticColors.error.main} />}
              accessibilityHint='Asks for confirmation before your account is permanently deleted'
            >
              <ButtonText>
                {isDeleting ? 'Deleting account…' : 'Delete account'}
              </ButtonText>
            </Button>

            <Text
              size='$1'
              color={neutralColors.text.muted}
              textAlign='center'
              selectable
            >
              You will then be signed out on all your devices.
            </Text>
          </YStack>
        </YStack>
      </ScrollView>

      <ActionConfirmModal
        visible={confirmationStep !== null}
        onClose={() => setConfirmationStep(null)}
        onConfirm={handleConfirm}
        icon={<Trash2 size={24} color={semanticColors.error.main} />}
        title={isFinalStep ? 'Delete everything?' : 'Delete account?'}
        description={
          isFinalStep
            ? 'This is the final confirmation. Your data will be permanently deleted and you will be signed out on all your devices.'
            : 'Your profile and all your data will be permanently deleted. This cannot be undone.'
        }
        confirmLabel={isFinalStep ? 'Delete everything' : 'Continue'}
        cancelLabel={isFinalStep ? 'Back' : 'Cancel'}
      />
    </AppShell>
  )
}
