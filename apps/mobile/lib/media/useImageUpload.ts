import { useCallback } from 'react'
import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import type { Id } from '@pa/backend/dataModel'

/** JPEG quality applied after resizing. */
const COMPRESSION = 0.85
/** Quality requested from the picker, before our own resize. */
const PICKER_QUALITY = 0.9

export interface PickImageOptions {
  /** Where to take the image from. */
  source?: 'library' | 'camera'
  /** Crop aspect ratio, e.g. [1, 1] for an avatar or [16, 9] for a cover. */
  aspect?: [number, number]
  /** Target width in pixels. Height follows the aspect unless given. */
  width: number
  /** Target height. Omit to let the resize keep the source aspect. */
  height?: number
}

/**
 * Pick, resize and upload an image to Convex storage.
 *
 * The quest cover picker and the profile picture picker had each grown a full
 * copy of this — same permission prompt wording, same manipulate settings,
 * same upload-and-parse-storageId dance — differing only in crop shape.
 *
 * Note this is the interactive path. `SyncManager` has its own upload for the
 * offline queue, which is deliberately separate: it retries in the background
 * and must not prompt anyone for anything.
 */
export function useImageUpload() {
  const generateUploadUrl = useMutation(api.functions.users.generateUploadUrl)

  /**
   * Prompt for an image and return a resized local copy.
   *
   * Returns null when permission is refused or the user cancels — both are
   * ordinary outcomes, not errors.
   */
  const pickImage = useCallback(
    async ({
      source = 'library',
      aspect,
      width,
      height,
    }: PickImageOptions): Promise<string | null> => {
      const fromCamera = source === 'camera'

      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          fromCamera
            ? 'Please allow access to your camera.'
            : 'Please allow access to your photo library.',
        )
        return null
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect,
            quality: PICKER_QUALITY,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect,
            quality: PICKER_QUALITY,
          })

      const asset = result.canceled ? undefined : result.assets[0]
      if (!asset) return null

      const resized = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: height === undefined ? { width } : { width, height } }],
        { compress: COMPRESSION, format: ImageManipulator.SaveFormat.JPEG },
      )
      return resized.uri
    },
    [],
  )

  /**
   * Upload a local image and return its Convex storage id.
   *
   * Throws if the upload is rejected — callers decide how to tell the user.
   */
  const uploadImage = useCallback(
    async (uri: string): Promise<Id<'_storage'>> => {
      const uploadUrl = await generateUploadUrl()

      const uploadResult = await uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': 'image/jpeg' },
      })

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Image upload failed (${uploadResult.status})`)
      }

      const { storageId } = JSON.parse(uploadResult.body) as {
        storageId: Id<'_storage'>
      }
      return storageId
    },
    [generateUploadUrl],
  )

  return { pickImage, uploadImage }
}
