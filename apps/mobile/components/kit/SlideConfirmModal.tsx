import React, { useState } from 'react'
import { Modal } from 'react-native'
import {
  YStack,
  XStack,
  Text,
  Button,
  ButtonText,
  neutralColors,
  overlayColors,
  IconContainer,
} from '@pa/ui'
import { SlideToConfirm } from './SlideToConfirm'

/** How long the confirmed state is shown before the action runs. */
const CONFIRM_SETTLE_MS = 500

export interface SlideConfirmModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  /** Icon shown above the title; size it to 28px. */
  icon: React.ReactNode
  title: string
  /** Body copy. Accepts nodes so callers can emphasise a name inline. */
  children: React.ReactNode
  /** Label on the slider before confirming. */
  slideLabel: string
  /** Label on the slider while the action settles. */
  confirmingLabel: string
}

/**
 * A confirmation the player has to slide, not tap.
 *
 * Used for actions that are disruptive mid-quest — stopping a run, skipping a
 * mission — where an accidental tap costs real progress. Stopping and skipping
 * had each grown their own copy of this shell, identical down to the settle
 * delay and the disabled-cancel behaviour.
 */
export function SlideConfirmModal({
  visible,
  onClose,
  onConfirm,
  icon,
  title,
  children,
  slideLabel,
  confirmingLabel,
}: SlideConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = () => {
    setIsConfirming(true)
    // Briefly show the confirmed state before the screen changes under them.
    setTimeout(() => {
      onConfirm()
      setIsConfirming(false)
    }, CONFIRM_SETTLE_MS)
  }

  // Ignore dismissal once confirmed: the action is already on its way.
  const handleClose = () => {
    if (!isConfirming) onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={handleClose}
    >
      <YStack
        flex={1}
        backgroundColor={overlayColors.dark}
        justifyContent='center'
        alignItems='center'
        padding='$4'
      >
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
          <YStack gap='$2' alignItems='center'>
            <IconContainer size='$5' variant='default'>
              {icon}
            </IconContainer>
            <Text
              size='$5'
              weight='bold'
              color={neutralColors.text.primary}
              textAlign='center'
            >
              {title}
            </Text>
          </YStack>

          <YStack gap='$2'>{children}</YStack>

          <YStack paddingTop='$2'>
            <SlideToConfirm
              label={slideLabel}
              confirmedLabel={confirmingLabel}
              onConfirm={handleConfirm}
              disabled={isConfirming}
            />
          </YStack>

          <XStack justifyContent='center' paddingTop='$2'>
            {/* Quiet text cancel — a filled pill would compete with the slider */}
            <Button
              variant='ghost'
              backgroundColor='transparent'
              onPress={handleClose}
              disabled={isConfirming}
            >
              <ButtonText variant='muted'>Annuleren</ButtonText>
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  )
}
