// AbiApp design system. Feature screens build on these components plus
// the native controls (Stack headers, NativeTabs, NativeMenu).

export { ArchGauge, type ArchGaugeProps, type ArchMarker } from "./ArchGauge";
export { CheckRow, type CheckRowProps } from "./CheckRow";
export { Chip, type ChipProps, type ChipTone } from "./Chip";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { GradeHero, type GradeHeroProps } from "./GradeHero";
export {
  HalfYearStrip,
  type HalfYearStripProps,
  type HalfYearValue,
} from "./HalfYearStrip";
export { Icon, iconStroke, type IconProps, type IconSize } from "./Icon";
export { IssueBanner, type IssueBannerProps } from "./IssueBanner";
export { ListRow, type ListRowMenu, type ListRowProps } from "./ListRow";
export {
  PointsBadge,
  type PointsBadgeProps,
  type PointsBadgeSize,
} from "./PointsBadge";
export { PointsPicker, type PointsPickerProps } from "./PointsPicker";
export { ProgressBar, type ProgressBarProps } from "./ProgressBar";
export { Section, type SectionProps } from "./Section";
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from "./SegmentedControl";
export { StatTile, type StatTileProps, type StatTone } from "./StatTile";
export { SubjectAvatar, type SubjectAvatarProps } from "./SubjectAvatar";
export {
  formatDecimal,
  formatGrade,
  gradeEquivalent,
  pointsPalette,
  pointsTier,
  type PointsPalette,
  type PointsTier,
} from "./points";
export {
  SUBJECT_COLOR_KEYS,
  SubjectPalette,
  isSubjectColorKey,
  resolveSubjectColor,
  subjectVisual,
  type SubjectColorKey,
  type SubjectVisual,
  type SubjectVisualHints,
} from "./subjects";
export { subjectTile } from "./subjectPalette";
export { useSubjectVisualResolver, type SubjectLike } from "./useSubjectVisual";
