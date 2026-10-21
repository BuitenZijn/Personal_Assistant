import React from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import {
  Button,
  ButtonText,
  IconContainer,
  Text,
  XStack,
  YStack,
  neutralColors,
  overlayColors,
} from '@pa/ui'

export interface ActionConfirmModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  icon: React.ReactNode
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
}

/** Branded confirmation dialog for destructive, single-tap actions. */
export function ActionConfirmModal({
  visible,
  onClose,
  onConfirm,
  icon,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
}: ActionConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel='Close confirmation'
        />

        <YStack
          backgroundColor={neutralColors.background.page}
          borderWidth={1}
          borderColor={neutralColors.border.default}
          borderRadius={12}
          padding='$5'
          gap='$4'
          width='100%'
          maxWidth={400}
        >
          <YStack gap='$3' alignItems='center'>
            <IconContainer size='$5' variant='default'>
              {icon}
            </IconContainer>
            <YStack gap='$2' alignItems='center'>
              <Text size='$5' weight='bold' textAlign='center' selectable>
                {title}
              </Text>
              <Text size='$3' variant='muted' textAlign='center' selectable>
                {description}
              </Text>
            </YStack>
          </YStack>

          <XStack gap='$3'>
            <Button
              flex={1}
              variant='outline'
              size='$4'
              onPress={onClose}
              accessibilityLabel={cancelLabel}
            >
              <ButtonText variant='secondary'>{cancelLabel}</ButtonText>
            </Button>
            <Button
              flex={1}
              variant='danger'
              size='$4'
              onPress={onConfirm}
              accessibilityLabel={confirmLabel}
            >
              <ButtonText variant='danger'>{confirmLabel}</ButtonText>
            </Button>
          </XStack>
        </YStack>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: overlayColors.dark,
  },
})
