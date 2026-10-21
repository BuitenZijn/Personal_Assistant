import React, { useState } from 'react'
import { Alert } from 'react-native'
import {
  YStack,
  Text,
  MicroLabel,
  Button,
  ButtonText,
  Card,
  brandColors,
  neutralColors,
  cardColors,
  Spinner,
} from '@pa/ui'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { useCurrentUser } from '../../../lib/useCurrentUser'
import { useImageUpload } from '../../../lib/media/useImageUpload'
import { Camera, ImageIcon, Trash2, Check } from 'lucide-react-native'
import { AppShell, ScreenHeader } from '../../../components/shell'

const CROP_SIZE = 512

/**
 * ProfilePictureScreen - Pick, crop, and upload a profile picture
 */
export function ProfilePictureScreen() {
  const navigation = useNavigation()
  const { user, imageUrl } = useCurrentUser()
  const updateProfile = useMutation(api.functions.users.updateProfile)
  const { pickImage, uploadImage } = useImageUpload()

  const [localUri, setLocalUri] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const displayUri = localUri ?? imageUrl

  /** Square crop, sized for an avatar. */
  const pickSquare = (source: 'library' | 'camera') => async () => {
    const uri = await pickImage({
      source,
      aspect: [1, 1],
      width: CROP_SIZE,
      height: CROP_SIZE,
    })
    if (uri) setLocalUri(uri)
  }

  const pickFromGallery = pickSquare('library')
  const pickFromCamera = pickSquare('camera')

  const handleSave = async () => {
    if (!localUri) return

    setIsSaving(true)
    try {
      const storageId = await uploadImage(localUri)

      // Update profile with new image
      await updateProfile({ image: storageId })

      Alert.alert('Done', 'Profile picture updated!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      Alert.alert(
        'Fout',
        'Your profile picture could not be uploaded. Try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = () => {
    setLocalUri(null)
  }

  const initial = (user?.firstName ?? user?.email ?? 'U')
    .charAt(0)
    .toUpperCase()

  return (
    <AppShell showHeader={false}>
      <ScreenHeader title='Profile picture' />
      <YStack flex={1} padding='$4' gap='$6' alignItems='center'>
        {/* Preview */}
        <YStack alignItems='center' gap='$3' paddingTop='$4'>
          {displayUri ? (
            <YStack
              width={180}
              height={180}
              borderRadius={90}
              overflow='hidden'
              borderWidth={1}
              borderColor={neutralColors.border.default}
            >
              <Image
                source={{ uri: displayUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit='cover'
              />
            </YStack>
          ) : (
            // Hairline ring with an amber initial — a 180px amber disc would
            // out-shout every action on the screen.
            <YStack
              width={180}
              height={180}
              borderRadius={90}
              borderWidth={1}
              borderColor={neutralColors.border.default}
              alignItems='center'
              justifyContent='center'
            >
              <Text
                fontSize={64}
                lineHeight={72}
                weight='bold'
                color={brandColors.primary}
              >
                {initial}
              </Text>
            </YStack>
          )}
          {localUri && (
            <Text size='$3' variant='success'>
              New photo selected
            </Text>
          )}
        </YStack>

        {/* Actions */}
        <Card padding='$4' width='100%' variant='outlined' borderRadius={10}>
          <YStack gap='$3'>
            <MicroLabel>Foto kiezen</MicroLabel>
            <Button
              variant='outline'
              size='$4'
              onPress={pickFromGallery}
              icon={<ImageIcon size={20} color={cardColors.text} />}
            >
              <ButtonText variant='secondary' flex={1} textAlign='left'>
                Choose from library
              </ButtonText>
            </Button>
            <Button
              variant='outline'
              size='$4'
              onPress={pickFromCamera}
              icon={<Camera size={20} color={cardColors.text} />}
            >
              <ButtonText variant='secondary' flex={1} textAlign='left'>
                Take a photo
              </ButtonText>
            </Button>
            {localUri && (
              <Button
                variant='outline'
                size='$4'
                onPress={handleRemove}
                icon={<Trash2 size={20} color={cardColors.text} />}
              >
                <ButtonText flex={1} textAlign='left'>
                  Clear selection
                </ButtonText>
              </Button>
            )}
          </YStack>
        </Card>

        {/* Save */}
        {localUri && (
          <Button
            variant='primary'
            size='$5'
            width='100%'
            onPress={handleSave}
            disabled={isSaving}
            opacity={isSaving ? 0.6 : 1}
            icon={
              isSaving ? (
                <Spinner size='small' color={neutralColors.background.page} />
              ) : (
                <Check size={20} color={neutralColors.background.page} />
              )
            }
          >
            <ButtonText variant='cta'>
              {isSaving ? 'Uploading…' : 'Save photo'}
            </ButtonText>
          </Button>
        )}
      </YStack>
    </AppShell>
  )
}

export default ProfilePictureScreen
