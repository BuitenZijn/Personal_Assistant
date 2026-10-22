import React, { useState } from 'react'
import { Alert } from 'react-native'
import { Card, StyledInput, Text } from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useAction } from 'convex/react'
import { api } from '@pa/backend/api'
import type { RecipesStackParamList } from '../../../navigation/types'
import { Field, FormScreen, SaveButton } from '../../../components/kit'
import { convexErrorData } from '../../../lib/convexErrors'

/** Add any recipe to the library by the link to its page. */
export function AddRecipeScreen() {
  const navigation =
    useNavigation<StackNavigationProp<RecipesStackParamList, 'AddRecipe'>>()
  const addFromUrl = useAction(api.functions.recipes.addFromUrl)
  const [url, setUrl] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    setIsAdding(true)
    try {
      const recipeId = await addFromUrl({ url })
      navigation.replace('Recipe', { recipeId })
    } catch (error) {
      Alert.alert(
        "We couldn't add this recipe",
        convexErrorData(error)?.message ??
          'Check your connection and try again.',
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <FormScreen title='Add a recipe'>
      <Text variant='muted'>
        Found a recipe you like? Paste its link and we’ll save it to your
        recipes.
      </Text>
      <Card padding='$4'>
        <Field label='Link to the recipe'>
          <StyledInput
            value={url}
            onChangeText={setUrl}
            placeholder='https://www.colruyt.be/nl/recepten/…'
            keyboardType='url'
            autoCapitalize='none'
            autoCorrect={false}
            size='$4'
            autoFocus
          />
        </Field>
      </Card>
      <SaveButton
        label='Add recipe'
        busyLabel='Reading the recipe…'
        busy={isAdding}
        disabled={!url.trim()}
        onPress={handleAdd}
      />
    </FormScreen>
  )
}
