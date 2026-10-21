// Re-export Tamagui components
export * from 'tamagui'

// Export Tamagui config
export { default as config } from './tamagui.config'

// Checkbox component
export { Checkbox, type CheckboxProps } from './Checkbox'

// Keyboard access for pressable stacks (role, tabIndex, Enter/Space)
export { keyboardPressable } from './pressable'

// Table components
export {
  Table,
  TableScroll,
  TableHead,
  TableHeadRow,
  TableHeadCell,
  TableHeadText,
  TableBody,
  TableRow,
  TableCell,
  TableCellText,
  TableEmptyState,
  TableFooter,
  type TableProps,
  type TableScrollProps,
  type TableHeadProps,
  type TableHeadRowProps,
  type TableHeadCellProps,
  type TableHeadTextProps,
  type TableBodyProps,
  type TableRowProps,
  type TableCellProps,
  type TableCellTextProps,
  type TableEmptyStateProps,
  type TableFooterProps,
} from './Table'

// Table pagination
export {
  TablePagination,
  PaginationContainer,
  PaginationControls,
  PaginationButton,
  PaginationInfo,
  PageSizeContainer,
  PageSizeLabel,
  type TablePaginationProps,
  type TablePaginationIcons,
  type PaginationContainerProps,
  type PaginationButtonProps,
} from './TablePagination'

// Table filters
export {
  FilterBar,
  FilterGroup,
  FilterLabel,
  SearchFilter,
  SelectFilter,
  MultiSelectFilter,
  type FilterBarProps,
  type FilterGroupProps,
  type FilterLabelProps,
  type SearchFilterProps,
  type SelectFilterProps,
  type SelectFilterOption,
  type MultiSelectFilterProps,
} from './TableFilters'

// Form components
export { FormInput, type FormInputProps } from './FormInput'
export { FormCard, type FormCardProps } from './FormCard'
export {
  FormFieldContainer,
  FormLabel,
  type FormFieldContainerProps,
  type FormLabelProps,
} from './FormField'

// Typography components
export {
  Text,
  ButtonText,
  AlertText,
  LinkText,
  MonoText,
  MicroLabel,
  monoFont,
  type TextProps,
  type ButtonTextProps,
  type AlertTextProps,
  type LinkTextProps,
  type MonoTextProps,
  type MicroLabelProps,
} from './Typography'
export {
  PageTitle,
  SectionTitle,
  CardTitle,
  BodyText,
  Caption,
  ValueText,
  IconText,
  type PageTitleProps,
  type SectionTitleProps,
  type CardTitleProps,
  type BodyTextProps,
  type CaptionProps,
  type ValueTextProps,
  type IconTextProps,
} from './Headings'

// Badge components
export { Badge, BadgeText, type BadgeProps, type BadgeTextProps } from './Badge'

// Card components - Primary Card from components.tsx
export { Card, type CardProps } from './components'

// Stat Card components - StatValue also replaces BigNumber
export {
  StatCard,
  StatLabel,
  StatValue,
  type StatCardProps,
  type StatLabelProps,
  type StatValueProps,
} from './StatCard'

// Info Card components - InfoCard also replaces AlertCard
export {
  InfoCard,
  InfoCardTitle,
  InfoCardText,
  type InfoCardProps,
  type InfoCardTitleProps,
  type InfoCardTextProps,
} from './InfoCard'

// Avatar components
export {
  Avatar,
  AvatarText,
  type AvatarProps,
  type AvatarTextProps,
} from './Avatar'

// Navigation components
export {
  NavLink,
  DropdownItem,
  type NavLinkProps,
  type DropdownItemProps,
} from './NavLink'

// Layout components
export {
  CenteredContainer,
  PageContainer,
  SectionContainer,
  LoadingSpinner,
  type CenteredContainerProps,
  type PageContainerProps,
  type SectionContainerProps,
  type LoadingSpinnerProps,
} from './Layout'

// Button components
export {
  Button,
  IconButton,
  type ButtonProps,
  type IconButtonProps,
} from './Buttons'

// Color system
export {
  brandColors,
  semanticColors,
  neutralColors,
  cardColors,
  roleColors,
  statusColors,
  teamColors,
  overlayColors,
  type BrandColors,
  type SemanticColors,
  type NeutralColors,
  type CardColors,
  type RoleColors,
  type StatusColors,
  type OverlayColors,
  type TeamColor,
} from './colors'

// Status indicators and color pickers
export {
  StatusDot,
  OnlineIndicator,
  ColorSwatchButton,
  TeamColorPicker,
  getNextTeamColor,
  SelectableCard,
  BatteryIndicator,
  getBatteryStatus,
  type StatusDotProps,
  type SelectableCardProps,
} from './StatusIndicator'

// Styled form components (Tamagui-based)
export {
  StyledInput,
  StyledTextArea,
  FormLabelText,
  type StyledInputProps,
  type StyledTextAreaProps,
  type FormLabelTextProps,
} from './StyledInput'

// Slider components
export {
  StyledSlider,
  SliderWithLabel,
  type StyledSliderProps,
  type SliderWithLabelProps,
} from './StyledSlider'

// Segmented control - compact mutually exclusive options
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedControlItem,
  type SegmentedControlFrameProps,
} from './SegmentedControl'

// Progress meter - horizontal fill bar for progress through a sequence
export {
  ProgressMeter,
  type ProgressMeterProps,
  type MeterTrackProps,
  type MeterFillProps,
} from './ProgressMeter'

// Readout components - instrument label/value pairs
export { Readout, ReadoutRow, type ReadoutProps } from './Readout'

// Chip components - hairline micro-label chips (Instrument system)
export { ChipFrame, StatusChip, type StatusChipProps } from './Chip'

// Mission & icon components
export {
  MissionTag,
  IconContainer,
  type MissionTagProps,
  type IconContainerProps,
} from './MissionTag'

// Panel components - Panel extends Card with elevated shadow
export {
  Panel,
  SidebarPanel,
  TableHeader,
  type PanelProps,
  type SidebarPanelProps,
  type TableHeaderProps,
} from './Panel'

// Overlay components (modals, sheets, popups)
// MenuContainer is now an alias for PopupContainer
export {
  SheetFrame,
  SheetHandle,
  DialogContentFrame,
  PopupContainer,
  MenuContainer,
  type SheetFrameProps,
  type SheetHandleProps,
  type DialogContentFrameProps,
  type PopupContainerProps,
  type MenuContainerProps,
} from './Overlay'

// Toast system
export {
  ToastProvider,
  Toaster,
  useToast,
  type ShowToastOptions,
  type ConfirmToastOptions,
} from './Toast'

// Skeleton / loading placeholders
export {
  Skeleton,
  QuestCardSkeleton,
  QuestListSkeleton,
  type SkeletonProps,
} from './Skeleton'
