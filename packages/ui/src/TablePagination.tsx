import { styled, GetProps, XStack, Select as TamaguiSelect } from 'tamagui'
import { neutralColors } from './colors'
import { keyboardPressable } from './pressable'
import { Text } from './Typography'
import type { ReactNode } from 'react'

/**
 * TablePagination - Pagination controls for data tables
 *
 * Features:
 * - Page size selector (10, 20, 50, 100)
 * - Previous/Volgende pagina buttons
 * - First/Laatste pagina buttons
 * - Current page indicator with total count
 *
 * @example
 * <TablePagination
 *   totalItems={150}
 *   pageSize={20}
 *   currentPage={1}
 *   onPageChange={(page) => setPage(page)}
 *   onPageSizeChange={(size) => setPageSize(size)}
 *   icons={{
 *     chevronLeft: <ChevronLeft size={16} />,
 *     chevronRight: <ChevronRight size={16} />,
 *     chevronsLeft: <ChevronsLeft size={16} />,
 *     chevronsRight: <ChevronsRight size={16} />,
 *     chevronDown: <ChevronDown size={16} />,
 *   }}
 * />
 */

interface TablePaginationIcons {
  chevronLeft: ReactNode
  chevronRight: ReactNode
  chevronsLeft?: ReactNode
  chevronsRight?: ReactNode
  chevronDown?: ReactNode
}

interface TablePaginationProps {
  /** Total number of items in the dataset */
  totalItems: number
  /** Number of items per pagina */
  pageSize: number
  /** Current page (0-indexed) */
  currentPage: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void
  /** Available page sizes */
  pageSizeOptions?: number[]
  /** Whether to show first/last buttons */
  showFirstLast?: boolean
  /** Icon elements to use */
  icons: TablePaginationIcons
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

/**
 * PaginationContainer - Wrapper for pagination controls
 */
export const PaginationContainer = styled(XStack, {
  name: 'PaginationContainer',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: '$4',
})

/**
 * PaginationInfo - Shows "Showing X-Y of Z items"
 */
export const PaginationInfo = styled(Text, {
  name: 'PaginationInfo',
  color: neutralColors.text.secondary,
  fontSize: 13,
})

/**
 * PaginationControls - Container for page buttons
 */
export const PaginationControls = styled(XStack, {
  name: 'PaginationControls',
  alignItems: 'center',
  gap: '$2',
})

/**
 * PageSizeContainer - Container for page size selector
 */
export const PageSizeContainer = styled(XStack, {
  name: 'PageSizeContainer',
  alignItems: 'center',
  gap: '$2',
})

/**
 * PageSizeLabel - Label for page size selector
 */
export const PageSizeLabel = styled(Text, {
  name: 'PageSizeLabel',
  color: neutralColors.text.secondary,
  fontSize: 13,
})

/**
 * PaginationButton - Styled button for pagination controls
 */
export const PaginationButton = styled(XStack, {
  name: 'PaginationButton',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: '$2',
  backgroundColor: 'transparent',
  cursor: 'pointer',

  hoverStyle: {
    backgroundColor: neutralColors.background.hover,
  },

  variants: {
    disabled: {
      true: {
        opacity: 0.4,
        cursor: 'not-allowed',
        hoverStyle: {
          backgroundColor: 'transparent',
        },
      },
    },
  } as const,
})

export function TablePagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  showFirstLast = true,
  icons,
}: TablePaginationProps) {
  const {
    chevronLeft,
    chevronRight,
    chevronsLeft,
    chevronsRight,
    chevronDown,
  } = icons
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems > 0 ? currentPage * pageSize + 1 : 0
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems)

  const canGoPrevious = currentPage > 0
  const canGoNext = currentPage < totalPages - 1

  return (
    <PaginationContainer>
      <PageSizeContainer>
        <PageSizeLabel>Toon</PageSizeLabel>
        <TamaguiSelect
          value={String(pageSize)}
          onValueChange={value => onPageSizeChange(Number(value))}
          size='$3'
        >
          <TamaguiSelect.Trigger
            width={80}
            backgroundColor={neutralColors.background.page}
            borderColor={neutralColors.border.default}
          >
            <TamaguiSelect.Value placeholder='20' />
            {chevronDown}
          </TamaguiSelect.Trigger>

          <TamaguiSelect.Content>
            <TamaguiSelect.Viewport>
              {pageSizeOptions.map(size => (
                <TamaguiSelect.Item
                  key={size}
                  index={size}
                  value={String(size)}
                >
                  <TamaguiSelect.ItemText>{size}</TamaguiSelect.ItemText>
                </TamaguiSelect.Item>
              ))}
            </TamaguiSelect.Viewport>
          </TamaguiSelect.Content>
        </TamaguiSelect>
        <PageSizeLabel>per pagina</PageSizeLabel>
      </PageSizeContainer>

      <PaginationInfo>
        {totalItems > 0
          ? `${startItem}–${endItem} van ${totalItems}`
          : 'Geen items'}
      </PaginationInfo>

      <PaginationControls>
        {showFirstLast && chevronsLeft && (
          <PaginationButton
            disabled={!canGoPrevious}
            onPress={() => canGoPrevious && onPageChange(0)}
            {...keyboardPressable(() => canGoPrevious && onPageChange(0), {
              disabled: !canGoPrevious,
            })}
            aria-label='Eerste pagina'
          >
            {chevronsLeft}
          </PaginationButton>
        )}
        <PaginationButton
          disabled={!canGoPrevious}
          onPress={() => canGoPrevious && onPageChange(currentPage - 1)}
          {...keyboardPressable(
            () => canGoPrevious && onPageChange(currentPage - 1),
            {
              disabled: !canGoPrevious,
            },
          )}
          aria-label='Vorige pagina'
        >
          {chevronLeft}
        </PaginationButton>
        <Text
          color={neutralColors.text.primary}
          fontSize={13}
          paddingHorizontal='$2'
        >
          Pagina {currentPage + 1} of {totalPages}
        </Text>
        <PaginationButton
          disabled={!canGoNext}
          onPress={() => canGoNext && onPageChange(currentPage + 1)}
          {...keyboardPressable(
            () => canGoNext && onPageChange(currentPage + 1),
            {
              disabled: !canGoNext,
            },
          )}
          aria-label='Volgende pagina'
        >
          {chevronRight}
        </PaginationButton>
        {showFirstLast && chevronsRight && (
          <PaginationButton
            disabled={!canGoNext}
            onPress={() => canGoNext && onPageChange(totalPages - 1)}
            {...keyboardPressable(
              () => canGoNext && onPageChange(totalPages - 1),
              {
                disabled: !canGoNext,
              },
            )}
            aria-label='Laatste pagina'
          >
            {chevronsRight}
          </PaginationButton>
        )}
      </PaginationControls>
    </PaginationContainer>
  )
}

export type { TablePaginationProps, TablePaginationIcons }
export type PaginationContainerProps = GetProps<typeof PaginationContainer>
export type PaginationButtonProps = GetProps<typeof PaginationButton>
