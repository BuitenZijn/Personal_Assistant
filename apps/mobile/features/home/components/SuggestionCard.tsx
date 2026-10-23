import React from 'react'
import {
  Button,
  Card,
  LinkText,
  MonoText,
  Text,
  XStack,
  YStack,
  brandColors,
  neutralColors,
} from '@pa/ui'
import { Check, ChefHat, Minus, Plus } from 'lucide-react-native'
import { RemoteImage } from '../../../components/kit'
import { cookingTime } from '../../recipes/format'
import { people } from '../format'

export type Suggestion = {
  title: string
  imageUrl: string | null
  totalMinutes: number | null
  reason: string
  picked: boolean
  servings: number
}

const THUMB = 72

function Thumb({ uri }: { uri: string | null }) {
  return uri ? (
    <RemoteImage
      uri={uri}
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
  )
}

/** − 4 people + */
function ServingsStepper({
  servings,
  onChange,
}: {
  servings: number
  onChange: (servings: number) => void
}) {
  return (
    <XStack alignItems='center' gap='$2'>
      <Button
        variant='secondary'
        size='$2'
        circular
        disabled={servings <= 1}
        onPress={() => onChange(servings - 1)}
        accessibilityLabel='Fewer people'
        icon={<Minus size={16} color={brandColors.primaryText} />}
      />
      <MonoText size='$3' minWidth={72} textAlign='center'>
        {people(servings)}
      </MonoText>
      <Button
        variant='secondary'
        size='$2'
        circular
        disabled={servings >= 20}
        onPress={() => onChange(servings + 1)}
        accessibilityLabel='More people'
        icon={<Plus size={16} color={brandColors.primaryText} />}
      />
    </XStack>
  )
}

/**
 * A suggested dinner. Tap it to pick it; picked ones get a servings stepper.
 */
export function SuggestionCard({
  suggestion,
  onTogglePick,
  onServings,
  onOpen,
  onReplace,
}: {
  suggestion: Suggestion
  onTogglePick: () => void
  onServings: (servings: number) => void
  onOpen: () => void
  /** Leave out when nothing is left to replace it with. */
  onReplace?: () => void
}) {
  const { picked } = suggestion
  return (
    <Card
      interactive
      variant={picked ? 'highlight' : 'default'}
      padding='$3'
      onPress={onTogglePick}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: picked }}
    >
      <YStack gap='$3'>
        <XStack gap='$3' alignItems='flex-start'>
          <Thumb uri={suggestion.imageUrl} />
          <YStack flex={1} gap='$1'>
            <Text size='$4' weight='semibold' numberOfLines={2}>
              {suggestion.title}
            </Text>
            {suggestion.totalMinutes ? (
              <Text size='$2' variant='muted'>
                {cookingTime(suggestion.totalMinutes)}
              </Text>
            ) : null}
            <Text size='$3' variant='muted'>
              {suggestion.reason}
            </Text>
          </YStack>
          <YStack
            width={24}
            height={24}
            borderRadius={12}
            borderWidth={2}
            borderColor={
              picked ? brandColors.primary : neutralColors.border.default
            }
            backgroundColor={picked ? brandColors.primary : 'transparent'}
            alignItems='center'
            justifyContent='center'
          >
            {picked ? (
              <Check size={14} color={neutralColors.text.onFill} />
            ) : null}
          </YStack>
        </XStack>
        <XStack alignItems='center' justifyContent='space-between' gap='$3'>
          {picked ? (
            <ServingsStepper
              servings={suggestion.servings}
              onChange={onServings}
            />
          ) : (
            <XStack gap='$4'>
              <LinkText onPress={onOpen}>View recipe</LinkText>
              {onReplace ? (
                <LinkText onPress={onReplace}>Replace</LinkText>
              ) : null}
            </XStack>
          )}
          {picked ? <LinkText onPress={onOpen}>View recipe</LinkText> : null}
        </XStack>
      </YStack>
    </Card>
  )
}
