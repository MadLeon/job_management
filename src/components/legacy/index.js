// ============================================================================
// 向后兼容导出
// ============================================================================
// 新结构: 
//   - layout/     (AppHeader, Sidebar, DashboardSidebarPageItem)
//   - table/      (JobTable, JobTableHeader, JobTableRow, JobDetailTable, JobDetailRow)
//   - common/     (PageTitle, ContainerTitle, Breadcrumbs, SearchBox)
//   - shared/     (DateCard, UserCard, PriorityChip, BadgeAvatars, RecordTechIcon)
//   - ui/         (ItemContainer, ActionButtonList)
//
// 旧导入路径在此仍可用，但推荐更新为新的分类导入
// ============================================================================

// Layout
export { default as AppHeader } from './layout/AppHeader';
export { default as Sidebar } from './layout/Sidebar';
export { default as DashboardSidebarPageItem } from './layout/DashboardSidebarPageItem';

// Table
export { default as JobTable } from './table/JobTable';
export { default as CollapsibleTable } from './table/JobTable'; // 向后兼容
export { default as JobTableHeader } from './table/JobTableHeader';
export { default as JobTableRow } from './table/JobTableRow';
export { default as JobDetailTable } from './table/JobDetailTable';
export { default as JobDetailRow } from './table/JobDetailRow';

// Common
export { default as PageTitle } from './common/PageTitle';
export { default as ContainerTitle } from './common/ContainerTitle';
export { default as Breadcrumbs } from './common/Breadcrumbs';
export { default as SearchBox } from './common/SearchBox';

// Shared
export { default as DateCard } from './shared/DateCard';
export { default as UserCard } from './shared/UserCard';
export { default as PriorityChip } from './shared/PriorityChip';
export { default as BadgeAvatars } from './shared/BadgeAvata';
export { default as BadgeAvata } from './shared/BadgeAvata'; // 向后兼容拼写
export { default as RecordTechIcon } from './shared/RecordTechIcon';

// UI
export { default as ItemContainer } from './ui/ItemContainer';
export { default as ActionButtonList } from './ui/ActionButtonList';
