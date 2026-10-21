import { styled, GetProps, XStack, YStack, Text } from 'tamagui'
import { neutralColors, brandColors } from './colors'

/**
 * Table - Data table container component
 *
 * A full-width table with proper border and background styling.
 * Works with TableHeader, TableBody, TableRow, and TableCell.
 *
 * @example
 * <Table>
 *   <TableHead>
 *     <TableHeadRow>
 *       <TableHeadCell>Name</TableHeadCell>
 *       <TableHeadCell>Status</TableHeadCell>
 *     </TableHeadRow>
 *   </TableHead>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>Quest 1</TableCell>
 *       <TableCell>Active</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */
export const Table = styled(YStack, {
  name: 'Table',
  width: '100%',
  backgroundColor: neutralColors.background.elevated,
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: neutralColors.border.default,
  // Clips the rounded corners. Wide tables wrap their head and body in a
  // TableScroll so narrow screens scroll instead of losing columns.
  overflow: 'hidden',
})

/**
 * TableScroll - horizontal scroll area for a table's head and body (web).
 *
 * Give it a `minWidth` that fits every column: rows stretch to that width,
 * and below it the area scrolls sideways instead of clipping the last
 * columns. Keep TableFooter outside so pagination stays in view.
 *
 * @example
 * <Table>
 *   <TableScroll>
 *     <YStack minWidth={960}>
 *       <TableHead>…</TableHead>
 *       <TableBody>…</TableBody>
 *     </YStack>
 *   </TableScroll>
 *   <TableFooter>…</TableFooter>
 * </Table>
 */
export const TableScroll = styled(YStack, {
  name: 'TableScroll',
  width: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
})

/**
 * TableHead - Container for table header rows
 */
export const TableHead = styled(YStack, {
  name: 'TableHead',
  backgroundColor: neutralColors.background.hover,
  borderBottomWidth: 1,
  borderBottomColor: neutralColors.border.default,
})

/**
 * TableHeadRow - A header row in the table
 */
export const TableHeadRow = styled(XStack, {
  name: 'TableHeadRow',
  width: '100%',
  alignItems: 'center',
  paddingVertical: '$3',
  paddingHorizontal: '$5',
  gap: '$4',
  minHeight: 48,
})

/**
 * TableHeadCell - A header cell with label styling
 *
 * Variants:
 * - sortable: Shows cursor pointer and hover effect for sortable columns
 * - sorted: Highlights the currently sorted column
 *
 * Width: Use `flex` prop for flexible widths or `width` for fixed
 */
export const TableHeadCell = styled(XStack, {
  name: 'TableHeadCell',
  alignItems: 'center',
  gap: '$2',

  variants: {
    sortable: {
      true: {
        cursor: 'pointer',
        hoverStyle: {
          opacity: 0.8,
        },
      },
    },
    sorted: {
      true: {
        // Sorted column gets brand color indicator
      },
    },
  } as const,
})

/**
 * TableHeadText - Text styling for header cells
 */
export const TableHeadText = styled(Text, {
  name: 'TableHeadText',
  fontSize: 12,
  fontWeight: '600',
  color: neutralColors.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  userSelect: 'none',

  variants: {
    sorted: {
      true: {
        color: brandColors.primary,
      },
    },
  } as const,
})

/**
 * TableBody - Container for table data rows
 */
export const TableBody = styled(YStack, {
  name: 'TableBody',
})

/**
 * TableRow - A data row in the table
 *
 * Variants:
 * - interactive: Adds hover/press effects for clickable rows
 * - selected: Highlights selected rows
 * - compact: Smaller padding for dense tables
 */
export const TableRow = styled(XStack, {
  name: 'TableRow',
  width: '100%',
  alignItems: 'center',
  paddingVertical: '$4',
  paddingHorizontal: '$5',
  gap: '$4',
  minHeight: 64,
  borderBottomWidth: 1,
  borderBottomColor: neutralColors.border.default,

  variants: {
    interactive: {
      true: {
        cursor: 'pointer',
        hoverStyle: {
          backgroundColor: neutralColors.background.hover,
        },
        pressStyle: {
          opacity: 0.95,
        },
      },
    },
    selected: {
      true: {
        backgroundColor: brandColors.primaryLight,
        borderBottomColor: brandColors.primary,
      },
    },
    compact: {
      true: {
        paddingVertical: '$3',
        minHeight: 52,
        gap: '$3',
      },
    },
  } as const,
})

/**
 * TableCell - A data cell in the table
 *
 * Use `flex` prop for flexible widths that match header cells.
 * Use `width` for fixed-width columns.
 *
 * @example
 * <TableCell flex={2}>Longer content</TableCell>
 * <TableCell flex={1}>Short</TableCell>
 * <TableCell width={100}>Fixed width</TableCell>
 */
export const TableCell = styled(XStack, {
  name: 'TableCell',
  alignItems: 'center',
  gap: '$2',
  overflow: 'hidden',
})

/**
 * TableCellText - Primary text styling for cell content
 */
export const TableCellText = styled(Text, {
  name: 'TableCellText',
  fontSize: 14,
  color: neutralColors.text.primary,
  lineHeight: 20,

  variants: {
    secondary: {
      true: {
        color: neutralColors.text.secondary,
        fontSize: 13,
      },
    },
    muted: {
      true: {
        color: neutralColors.text.muted,
        fontSize: 13,
      },
    },
    truncate: {
      true: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    },
  } as const,
})

/**
 * TableEmptyState - Display when table has no data
 */
export const TableEmptyState = styled(YStack, {
  name: 'TableEmptyState',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: '$8',
  paddingHorizontal: '$4',
  gap: '$2',
})

/**
 * TableFooter - Container for pagination and table actions
 */
export const TableFooter = styled(XStack, {
  name: 'TableFooter',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: '$3',
  paddingHorizontal: '$5',
  backgroundColor: neutralColors.background.hover,
  borderTopWidth: 1,
  borderTopColor: neutralColors.border.default,
})

// Type exports
export type TableProps = GetProps<typeof Table>
export type TableScrollProps = GetProps<typeof TableScroll>
export type TableHeadProps = GetProps<typeof TableHead>
export type TableHeadRowProps = GetProps<typeof TableHeadRow>
export type TableHeadCellProps = GetProps<typeof TableHeadCell>
export type TableHeadTextProps = GetProps<typeof TableHeadText>
export type TableBodyProps = GetProps<typeof TableBody>
export type TableRowProps = GetProps<typeof TableRow>
export type TableCellProps = GetProps<typeof TableCell>
export type TableCellTextProps = GetProps<typeof TableCellText>
export type TableEmptyStateProps = GetProps<typeof TableEmptyState>
export type TableFooterProps = GetProps<typeof TableFooter>
