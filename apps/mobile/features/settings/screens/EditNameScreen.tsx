import React, { useState, useEffect } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import {
  YStack,
  MicroLabel,
  Button,
  ButtonText,
  Card,
  StyledInput,
  neutralColors,
  Spinner,
} from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { useCurrentUser } from '../../../lib/useCurrentUser'
import { Check } from 'lucide-react-native'
import { AppShell, ScreenHeader } from '../../../components/shell'

/**
 * EditNameScreen - Edit first and last name
 */
export function EditNameScreen() {
  const navigation = useNavigation()
  const { user } = useCurrentUser()
  const updateProfile = useMutation(api.functions.users.updateProfile)

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [initialized, setInitialized] = useState(!!user)

  // Sync user data into state once the query resolves (useState only reads initial value once)
  useEffect(() => {
    if (user && !initialized) {
      setFirstName(user.firstName ?? '')
      setLastName(user.lastName ?? '')
      setInitialized(true)
    }
  }, [user, initialized])

  const hasChanges =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '')

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'Your first name cannot be empty.')
      return
    }

    setIsSaving(true)
    try {
      await updateProfile({
        firstName: firstName.trim(),
        // '' clears it; undefined would leave the old last name in place
        lastName: lastName.trim(),
      })
      Alert.alert('Done', 'Name updated!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error) {
      console.error('Error updating name:', error)
      Alert.alert('Fout', 'Your name could not be updated. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell showHeader={false}>
      <ScreenHeader title='Change name' />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
        >
          <Card padding='$4' variant='outlined' borderRadius={10}>
            <YStack gap='$4'>
              <YStack gap='$2'>
                <MicroLabel>First name</MicroLabel>
                <StyledInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder='Enter your first name'
                  size='$4'
                  autoFocus
                />
              </YStack>
              <YStack gap='$2'>
                <MicroLabel>Last name</MicroLabel>
                <StyledInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder='Enter your last name'
                  size='$4'
                />
              </YStack>
            </YStack>
          </Card>

          <Button
            variant='primary'
            size='$5'
            onPress={handleSave}
            disabled={isSaving || !hasChanges}
            icon={
              isSaving ? (
                <Spinner size='small' color={neutralColors.background.page} />
              ) : (
                <Check size={20} color={neutralColors.background.page} />
              )
            }
          >
            <ButtonText variant='cta'>
              {isSaving ? 'Saving…' : 'Save changes'}
            </ButtonText>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  )
}

export default EditNameScreen
