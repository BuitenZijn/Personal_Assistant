import React, { useState } from 'react'
import { Alert, SectionList } from 'react-native'
import {
  Button,
  ButtonText,
  MicroLabel,
  Skeleton,
  StyledInput,
  Text,
  XStack,
  YStack,
  neutralColors,
} from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { ChefHat, Plus, Search } from 'lucide-react-native'
import type { FunctionReturnType } from 'convex/server'
import type { MainStackParamList } from '../../../navigation/types'
import { AppShell } from '../../../components/shell'
import { EmptyState, emptyStateIconColor } from '../../../components/kit'
import { useQueryState } from '../../../lib/convex'
import { convexErrorData } from '../../../lib/convexErrors'
import { SwipeableRecipeCard } from '../components/RecipeCard'
import { matchesSearch } from '../format'

type SavedRecipe = FunctionReturnType<
  typeof api.functions.recipes.saved
>['other'][number]

type NavigationProp = StackNavigationProp<MainStackParamList>

function AddButton() {
  const navigation = useNavigation<NavigationProp>()
  return (
    <Button
      variant='ghost'
      size='$3'
      circular
      onPress={() => navigation.navigate('AddRecipe')}
      accessibilityLabel='Add a recipe by its link'
      icon={<Plus size={22} color={neutralColors.text.secondary} />}
    />
  )
}

function LoadingList() {
  return (
    <YStack gap='$3'>
      {[0, 1, 2, 3].map(i => (
        <Skeleton key={i} height={88} radius={10} />
      ))}
    </YStack>
  )
}

function showError(title: string, error: unknown) {
  Alert.alert(
    title,
    convexErrorData(error)?.message ?? 'Check your connection and try again.',
  )
}

/**
 * Your saved recipes, newest first, with search: this week's dinners
 * first, then your favourites, then the others. Swipe a card to delete it;
 * tap the heart to keep it as a favourite.
 */
export function RecipesScreen() {
  const navigation = useNavigation<NavigationProp>()
  const tabBarHeight = useBottomTabBarHeight()
  const saved = useQueryState(api.functions.recipes.saved)
  const removeSaved = useMutation(api.functions.recipes.removeSaved)
  const setFavourite = useMutation(api.functions.recipes.setFavourite)
  const [search, setSearch] = useState('')

  if (
    saved.status === 'ready' &&
    saved.data.thisWeek.length === 0 &&
    saved.data.favourites.length === 0 &&
    saved.data.other.length === 0
  ) {
    return (
      <AppShell title='Recipes' showBack={false} rightAction={<AddButton />}>
        <EmptyState
          icon={<ChefHat size={30} color={emptyStateIconColor} />}
          title='No saved recipes yet'
          description='Recipes you pick for your dinners, or add by their link, show up here.'
          action={
            <Button
              variant='secondary'
              onPress={() => navigation.navigate('AddRecipe')}
            >
              <ButtonText variant='secondary'>Add a recipe</ButtonText>
            </Button>
          }
        />
      </AppShell>
    )
  }

  const term = search.trim()
  const matching = (list: SavedRecipe[] | undefined) =>
    (list ?? []).filter(r => matchesSearch(r.title, term))
  const sections = [
    { title: 'This week’s dinners', data: matching(saved.data?.thisWeek) },
    { title: 'Favourite recipes', data: matching(saved.data?.favourites) },
    { title: 'Other recipes', data: matching(saved.data?.other) },
  ].filter(s => s.data.length > 0)

  const remove = (recipe: SavedRecipe) =>
    void removeSaved({ recipeId: recipe._id }).catch(error =>
      showError("We couldn't delete this recipe", error),
    )
  const toggleFavourite = (recipe: SavedRecipe) =>
    void setFavourite({
      recipeId: recipe._id,
      favourite: !recipe.favourite,
    }).catch(error => showError("We couldn't change your favourites", error))

  return (
    <AppShell title='Recipes' showBack={false} rightAction={<AddButton />}>
      <SectionList
        sections={sections}
        keyExtractor={item => item._id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <MicroLabel paddingHorizontal='$1' paddingTop='$3'>
            {section.title}
          </MicroLabel>
        )}
        renderItem={({ item }) => (
          <SwipeableRecipeCard
            recipe={item}
            onPress={() =>
              navigation.navigate('Recipe', { recipeId: item._id })
            }
            onToggleFavourite={() => toggleFavourite(item)}
            onDelete={() => remove(item)}
          />
        )}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: tabBarHeight + 40,
        }}
        ListHeaderComponent={
          <XStack alignItems='center' marginBottom='$1'>
            <YStack position='absolute' left='$3' zIndex={1}>
              <Search size={18} color={neutralColors.text.muted} />
            </YStack>
            <StyledInput
              flex={1}
              value={search}
              onChangeText={setSearch}
              placeholder='Search your recipes'
              autoCorrect={false}
              returnKeyType='search'
              paddingLeft={40}
              size='$4'
            />
          </XStack>
        }
        ListEmptyComponent={
          saved.status === 'loading' ? (
            <LoadingList />
          ) : (
            <Text variant='muted' textAlign='center' paddingTop='$6'>
              No saved recipes match “{term}”.
            </Text>
          )
        }
      />
    </AppShell>
  )
}
