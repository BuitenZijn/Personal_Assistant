import React, { useState } from 'react'
import { FlatList } from 'react-native'
import {
  Button,
  ButtonText,
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
import { api } from '@pa/backend/api'
import { ChefHat, Plus, Search } from 'lucide-react-native'
import type { MainStackParamList } from '../../../navigation/types'
import { AppShell } from '../../../components/shell'
import { EmptyState, emptyStateIconColor } from '../../../components/kit'
import { useQueryState } from '../../../lib/convex'
import { RecipeCard } from '../components/RecipeCard'
import { matchesSearch } from '../format'

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

/** Your saved recipes, newest first, with search. */
export function RecipesScreen() {
  const navigation = useNavigation<NavigationProp>()
  const tabBarHeight = useBottomTabBarHeight()
  const saved = useQueryState(api.functions.recipes.saved)
  const [search, setSearch] = useState('')

  if (saved.status === 'ready' && saved.data.length === 0) {
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
  const recipes = (saved.data ?? []).filter(r => matchesSearch(r.title, term))

  return (
    <AppShell title='Recipes' showBack={false} rightAction={<AddButton />}>
      <FlatList
        data={recipes}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPress={() =>
              navigation.navigate('Recipe', { recipeId: item._id })
            }
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
