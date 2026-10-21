import React, { useState } from 'react'
import { Linking, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  brandColors,
  Button,
  ButtonText,
  InfoCard,
  MicroLabel,
  neutralColors,
  semanticColors,
  Text,
  XStack,
  YStack,
} from '@pa/ui'
import { ArrowRight, Download, ShieldCheck } from 'lucide-react-native'
import type { MinimumVersionPolicy } from './version-policy'

interface MinimumVersionScreenProps {
  currentVersion: string
  currentBuild: number
  policy: MinimumVersionPolicy
  openStore?: (url: string) => Promise<void>
}

export function MinimumVersionScreen({
  currentVersion,
  currentBuild,
  policy,
  openStore = Linking.openURL,
}: MinimumVersionScreenProps) {
  const insets = useSafeAreaInsets()
  const [storeError, setStoreError] = useState(false)
  const storeName = policy.platform === 'ios' ? 'App Store' : 'Play Store'

  const handleOpenStore = async () => {
    setStoreError(false)
    try {
      await openStore(policy.storeUrl)
    } catch {
      setStoreError(true)
    }
  }

  return (
    <YStack flex={1} backgroundColor={neutralColors.background.page}>
      <ScrollView
        contentInsetAdjustmentBehavior='automatic'
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
          paddingHorizontal: 24,
        }}
      >
        <YStack
          flex={1}
          justifyContent='center'
          gap='$6'
          maxWidth={520}
          width='100%'
          alignSelf='center'
        >
          <YStack gap='$4' alignItems='center'>
            <YStack
              width={72}
              height={72}
              borderRadius={36}
              backgroundColor={brandColors.primaryLight}
              borderWidth={1}
              borderColor={brandColors.primary}
              alignItems='center'
              justifyContent='center'
            >
              <Download size={32} color={brandColors.primary} />
            </YStack>
            <MicroLabel color={brandColors.primary}>UPDATE NODIG</MicroLabel>
            <Text
              size='$8'
              weight='bold'
              textAlign='center'
              maxWidth={420}
              selectable
            >
              A newer version of Personal Assistant is needed
            </Text>
            <Text
              size='$4'
              variant='muted'
              textAlign='center'
              maxWidth={390}
              selectable
            >
              {policy.message ?? 'Update the app to keep using it.'}
            </Text>
          </YStack>

          <YStack
            padding='$5'
            borderRadius='$4'
            backgroundColor={neutralColors.background.elevated}
          >
            <XStack alignItems='center' justifyContent='space-between' gap='$4'>
              <YStack gap='$1' flex={1}>
                <MicroLabel>JOUW VERSIE</MicroLabel>
                <Text size='$4' weight='semibold' selectable>
                  {currentVersion}
                </Text>
                <Text size='$2' variant='muted' selectable>
                  Build {currentBuild}
                </Text>
              </YStack>

              <ArrowRight size={22} color={neutralColors.text.muted} />

              <YStack gap='$1' flex={1} alignItems='flex-end'>
                <MicroLabel color={brandColors.primary}>NODIG</MicroLabel>
                <Text
                  size='$4'
                  weight='semibold'
                  color={brandColors.primary}
                  selectable
                >
                  {policy.minimumVersion}
                </Text>
                <Text size='$2' variant='muted' selectable>
                  Build {policy.minimumBuild}+
                </Text>
              </YStack>
            </XStack>
          </YStack>

          <YStack gap='$3'>
            {storeError && (
              <InfoCard
                variant='error'
                size='$3'
                accessibilityRole='alert'
                accessibilityLiveRegion='polite'
              >
                <Text size='$2' variant='error' selectable>
                  We konden de {storeName}. Check your connection and try again.
                </Text>
              </InfoCard>
            )}

            <Button
              size='$5'
              onPress={handleOpenStore}
              accessibilityRole='button'
              accessibilityLabel={`Open ${storeName}`}
            >
              <XStack alignItems='center' gap='$2'>
                <Download size={20} color={neutralColors.background.page} />
                <ButtonText variant='cta'>
                  {storeError ? 'Try again' : `Open ${storeName}`}
                </ButtonText>
              </XStack>
            </Button>

            <XStack alignItems='center' justifyContent='center' gap='$2'>
              <ShieldCheck size={16} color={semanticColors.success.main} />
              <Text size='$2' variant='muted' textAlign='center' selectable>
                Your data is kept.
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
