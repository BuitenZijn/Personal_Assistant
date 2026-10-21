import React from 'react'
import { Image, type ImageProps } from 'expo-image'

/**
 * Placeholder shown while a remote image loads.
 *
 * One value, in one place. This literal had been pasted into nine components,
 * so nobody could change the loading look without finding all nine.
 */
export const IMAGE_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'

/** Crossfade duration when the real image arrives. */
const TRANSITION_MS = 200

export interface RemoteImageProps extends Omit<ImageProps, 'source'> {
  /** Image URL. Render nothing upstream when you have no URL. */
  uri: string
}

/**
 * An image loaded over the network, with the app's shared placeholder and
 * crossfade already applied.
 */
export function RemoteImage({ uri, ...rest }: RemoteImageProps) {
  return (
    <Image
      source={{ uri }}
      contentFit='cover'
      transition={TRANSITION_MS}
      placeholder={{ blurhash: IMAGE_BLURHASH }}
      {...rest}
    />
  )
}
