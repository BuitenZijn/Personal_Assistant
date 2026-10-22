import React, { useState } from 'react'
import { Alert, Linking, ScrollView } from 'react-native'
import {
  Button,
  ButtonText,
  Card,
  LinkText,
  MicroLabel,
  Skeleton,
  Text,
  XStack,
  YStack,
  brandColors,
  neutralColors,
  semanticColors,
} from '@pa/ui'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import type { Id } from '@pa/backend/dataModel'
import { Clock, Trash2, Users } from 'lucide-react-native'
import type { RecipesStackParamList } from '../../../navigation/types'
import { AppShell, ScreenHeader } from '../../../components/shell'
import {
  ActionConfirmModal,
  EmptyState,
  RemoteImage,
  emptyStateIconColor,
} from '../../../components/kit'
import { useQueryState } from '../../../lib/convex'
import { cookingTime } from '../format'

/** A recipe: photo, what you need, and how to make it. */
export function RecipeScreen() {
  const navigation = useNavigation()
  const { params } = useRoute<RouteProp<RecipesStackParamList, 'Recipe'>>()
  const recipe = useQueryState(api.functions.recipes.get, {
    id: params.recipeId as Id<'recipes'>,
  })
  const removeSaved = useMutation(api.functions.recipes.removeSaved)
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (recipe.status === 'loading') {
    return (
      <AppShell showHeader={false}>
        <ScreenHeader title='Recipe' />
        <YStack padding='$4' gap='$3'>
          <Skeleton height={220} radius={10} />
          <Skeleton height={28} width='70%' />
          <Skeleton height={160} radius={10} />
        </YStack>
      </AppShell>
    )
  }
  if (!recipe.data) {
    return (
      <AppShell showHeader={false}>
        <ScreenHeader title='Recipe' />
        <EmptyState
          icon={<Clock size={30} color={emptyStateIconColor} />}
          title='This recipe is gone'
          description='It may have been removed.'
        />
      </AppShell>
    )
  }

  const data = recipe.data
  const handleRemove = async () => {
    setConfirmRemove(false)
    try {
      await removeSaved({ recipeId: data._id })
      navigation.goBack()
    } catch {
      Alert.alert(
        "We couldn't remove this recipe",
        'Check your connection and try again.',
      )
    }
  }

  return (
    <AppShell showHeader={false}>
      <ScreenHeader title={data.title} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {data.imageUrl ? (
          <RemoteImage
            uri={data.imageUrl}
            style={{ width: '100%', aspectRatio: 3 / 2, borderRadius: 10 }}
            accessibilityIgnoresInvertColors
          />
        ) : null}

        <YStack gap='$2'>
          <Text size='$6' weight='semibold'>
            {data.title}
          </Text>
          <XStack gap='$4' flexWrap='wrap'>
            {data.totalMinutes ? (
              <XStack alignItems='center' gap='$1.5'>
                <Clock size={16} color={neutralColors.text.secondary} />
                <Text size='$3' variant='muted'>
                  {cookingTime(data.totalMinutes)}
                </Text>
              </XStack>
            ) : null}
            {data.servings ? (
              <XStack alignItems='center' gap='$1.5'>
                <Users size={16} color={neutralColors.text.secondary} />
                <Text size='$3' variant='muted'>
                  {data.servings} {data.servings === 1 ? 'person' : 'people'}
                </Text>
              </XStack>
            ) : null}
          </XStack>
          {data.tags.length ? (
            <Text size='$2' variant='muted'>
              {data.tags.join(' · ')}
            </Text>
          ) : null}
        </YStack>

        <Card padding='$4'>
          <YStack gap='$2'>
            <MicroLabel>Ingredients</MicroLabel>
            {data.ingredients.map((ingredient, i) => (
              <XStack key={i} gap='$2' alignItems='flex-start'>
                <Text size='$3' color={brandColors.accent}>
                  •
                </Text>
                <Text size='$3' flex={1}>
                  {ingredient.text}
                </Text>
              </XStack>
            ))}
          </YStack>
        </Card>

        {data.steps.length ? (
          <Card padding='$4'>
            <YStack gap='$3'>
              <MicroLabel>How to make it</MicroLabel>
              {data.steps.map((step, i) => (
                <XStack key={i} gap='$3' alignItems='flex-start'>
                  <Text size='$3' weight='semibold' width={20}>
                    {i + 1}
                  </Text>
                  <Text size='$3' flex={1} variant='muted'>
                    {step}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </Card>
        ) : null}

        <YStack alignItems='center' gap='$4' paddingBottom='$6'>
          <LinkText onPress={() => void Linking.openURL(data.url)}>
            View on {data.host}
          </LinkText>
          {data.saved ? (
            <Button variant='danger' onPress={() => setConfirmRemove(true)}>
              <ButtonText>Remove from saved recipes</ButtonText>
            </Button>
          ) : null}
        </YStack>
      </ScrollView>

      <ActionConfirmModal
        visible={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        icon={<Trash2 size={24} color={semanticColors.error.main} />}
        title='Remove this recipe?'
        description='It leaves your saved recipes.'
        confirmLabel='Remove'
      />
    </AppShell>
  )
}
