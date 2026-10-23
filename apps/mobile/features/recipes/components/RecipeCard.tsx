import React, { useRef } from 'react'
import { Alert } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import {
  Button,
  Card,
  Text,
  XStack,
  YStack,
  brandColors,
  neutralColors,
} from '@pa/ui'
import { ChefHat, Heart, Trash2 } from 'lucide-react-native'
import { RemoteImage } from '../../../components/kit'
import { recipeMeta } from '../format'

export type RecipeSummary = {
  _id: string
  title: string
  host: string
  imageUrl: string | null
  totalMinutes: number | null
  servings: number | null
  favourite: boolean
}

const THUMB = 64
const DELETE_WIDTH = 96

/** A recipe in a list: photo, title, time and servings, and a heart. */
export function RecipeCard({
  recipe,
  onPress,
  onToggleFavourite,
}: {
  recipe: RecipeSummary
  onPress: () => void
  onToggleFavourite: () => void
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
        <Button
          variant='ghost'
          size='$4'
          circular
          onPress={onToggleFavourite}
          accessibilityRole='checkbox'
          accessibilityState={{ checked: recipe.favourite }}
          accessibilityLabel={
            recipe.favourite ? 'Remove from favourites' : 'Add to favourites'
          }
          icon={
            <Heart
              size={22}
              color={
                recipe.favourite
                  ? brandColors.accent
                  : neutralColors.text.secondary
              }
              fill={recipe.favourite ? brandColors.accent : 'none'}
            />
          }
        />
      </XStack>
    </Card>
  )
}

function DeleteAction() {
  return (
    <YStack
      width={DELETE_WIDTH}
      marginLeft='$3'
      borderRadius={10}
      backgroundColor={brandColors.destructive}
      alignItems='center'
      justifyContent='center'
      gap='$1'
    >
      <Trash2 size={22} color={neutralColors.background.card} />
      <Text size='$4' weight='semibold' color={neutralColors.background.card}>
        Delete
      </Text>
    </YStack>
  )
}

/** A recipe card you swipe left to delete, after confirming. */
export function SwipeableRecipeCard({
  recipe,
  onDelete,
  ...card
}: React.ComponentProps<typeof RecipeCard> & { onDelete: () => void }) {
  const swipeable = useRef<SwipeableMethods>(null)
  const confirmDelete = () =>
    Alert.alert(
      'Delete this recipe?',
      `“${recipe.title}” is taken out of your saved recipes.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeable.current?.close(),
        },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
      { onDismiss: () => swipeable.current?.close() },
    )
  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={2}
      rightThreshold={DELETE_WIDTH / 2}
      overshootRight={false}
      renderRightActions={() => <DeleteAction />}
      onSwipeableOpen={confirmDelete}
    >
      <RecipeCard recipe={recipe} {...card} />
    </ReanimatedSwipeable>
  )
}
