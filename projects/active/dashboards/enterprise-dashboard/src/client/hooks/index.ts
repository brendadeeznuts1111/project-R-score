/**
 * Client Hooks - Barrel Export
 *
 * January 21, 2026 - Bun 1.3.6
 */

// Performance Polish Hooks (Bun-native primitives)
export {
  useDeferredData,
  createDeferredComponent,
  DefaultSkeleton,
  SkeletonRect,
  SkeletonText,
  type DeferredDataOptions,
  type DeferredDataResult,
} from "./useDeferredData";

export {
  useTransitionThemeSwitch,
  useThemeCSSVariables,
  type ThemeName,
  type ThemeColors,
  type TransitionThemeResult,
} from "./useTransitionThemeSwitch";

export {
  useVirtualizedMatrix,
  useMatrixKeyboardNavigation,
  type MatrixColumn,
  type UseVirtualizedMatrixOptions,
  type VirtualizedMatrixResult,
} from "./useVirtualizedMatrix";

export {
  useOptimisticProbe,
  useBatchProbe,
  useContinuousProbe,
  type ProbeStatus,
  type ProbeResult,
  type UseOptimisticProbeOptions,
  type UseOptimisticProbeResult,
} from "./useOptimisticProbe";

export {
  useCRC32IntegrityGuard,
  useBatchCRC32Guard,
  useAssetIntegrityGuard,
  type AssetKey,
  type AssetInfo,
  type UseCRC32Result,
} from "./useCRC32IntegrityGuard";

export {
  useGlobalShortcuts,
  pubsub,
  normalizeKey,
  parseKeyCombo,
  matchesKeyCombo,
  PLATFORM,
  type ShortcutAction,
  type ShortcutConflict,
  type ShortcutBindResult,
  type UseGlobalShortcutsOptions,
} from "./useGlobalShortcuts";

export {
  useRealtimeData,
  useDashboardRealtime,
  useMetricsRealtime,
  useAlertsRealtime,
  useActivityRealtime,
  type RealtimeTopic,
  type RealtimeMessage,
  type ConnectionState,
  type UseRealtimeOptions,
} from "./useRealtimeData";

export {
  useConfigUpdated,
  type ConfigUpdatedDetail,
  type ConfigUpdatedHandler,
} from "./useConfigUpdated";

export { useConfigStatusPoll } from "./useConfigStatusPoll";
