import React, { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { Card, Checkbox, Text, YStack } from '@pa/ui'
import { useNavigation } from '@react-navigation/native'
import { useMutation } from 'convex/react'
import { api } from '@pa/backend/api'
import { convexErrorData } from '../../../lib/convexErrors'
import { FormScreen, SaveButton } from '../../../components/kit'
import { useHousehold } from '../../household'

/** The recipe sites the household's weekly dinners are suggested from. */
export function RecipeSitesScreen() {
  const navigation = useNavigation()
  const household = useHousehold()
  const updateSettings = useMutation(api.functions.households.updateSettings)

  const [selected, setSelected] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const sites = household.data?.recipeSites
  useEffect(() => {
    if (sites && !initialized) {
      setSelected(sites.filter(s => s.selected).map(s => s.host))
      setInitialized(true)
    }
  }, [sites, initialized])

  const toggle = (host: string, checked: boolean) =>
    setSelected(current =>
      checked ? [...current, host] : current.filter(h => h !== host),
    )

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings({ recipeSites: selected })
      navigation.goBack()
    } catch (error) {
      Alert.alert(
        "We couldn't save this",
        convexErrorData(error)?.message ??
          'Check your connection and try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormScreen title='Recipe sites'>
      <Card padding='$4'>
        <YStack gap='$4'>
          <Text variant='muted'>
            We suggest your dinners from the sites you tick. This is the same
            for everyone in your household.
          </Text>
          {(sites ?? []).map(site => (
            <Checkbox
              key={site.host}
              checked={selected.includes(site.host)}
              onCheckedChange={checked => toggle(site.host, checked === true)}
              label={site.name}
            />
          ))}
        </YStack>
      </Card>

      <SaveButton
        label={
          selected.length === 0 ? 'Tick at least one site' : 'Save changes'
        }
        busyLabel='Saving…'
        busy={isSaving}
        disabled={!initialized || selected.length === 0}
        onPress={handleSave}
      />
    </FormScreen>
  )
}
