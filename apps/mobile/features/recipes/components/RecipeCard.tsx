import React from 'react'
import { Card, Text, XStack, YStack, neutralColors } from '@pa/ui'
import { ChefHat } from 'lucide-react-native'
import { RemoteImage } from '../../../components/kit'
import { recipeMeta } from '../format'

export type RecipeSummary = {
  _id: string
  title: string
  host: string
  imageUrl: string | null
  totalMinutes: number | null
  servings: number | null
}

const THUMB = 64

/** A recipe in a list: photo, title, time and servings. */
export function RecipeCard({
  recipe,
  onPress,
}: {
  recipe: RecipeSummary
  onPress: () => void
}) {
  const meta = recipeMeta(recipe.totalMinutes, recipe.servings)
  return (
    <Card interactive padding='$3' onPress={onPress}>
      <XStack alignItems='center' gap='$3'>
        {recipe.imageUrl ? (
          <RemoteImage
            uri={recipe.imageUrl}
            style={{ width: THUMB, height: THUMB, borderRadius: 8 }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <YStack
            width={THUMB}
            height={THUMB}
            borderRadius={8}
            backgroundColor={neutralColors.background.hover}
            alignItems='center'
            justifyContent='center'
          >
            <ChefHat size={24} color={neutralColors.text.muted} />
          </YStack>
        )}
        <YStack flex={1} gap='$1'>
          <Text size='$4' weight='medium' numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text size='$2' variant='muted' numberOfLines={1}>
            {meta ? `${meta} · ${recipe.host}` : recipe.host}
          </Text>
        </YStack>
      </XStack>
    </Card>
  )
}
