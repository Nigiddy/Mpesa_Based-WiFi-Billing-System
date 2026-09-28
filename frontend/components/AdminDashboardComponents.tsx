// Dashboard component barrel — only exports actively consumed components.
// StatCards, KPISummary, and Shared previously re-exported unused components
// that were removed in the cleanup pass (PremiumStatCard, StatCardsGrid,
// KPISummary, TableRowHighlight, SkeletonStatCard, SkeletonStatCards).
export * from './admin/dashboard/ActivityFeed'
export * from './admin/dashboard/Shared'
