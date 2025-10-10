/**
 * Common CSS class strings for consistent styling across the application
 * Use these constants to maintain consistency and make theme updates easier
 */

// ============================================================================
// FORM INPUTS
// ============================================================================

export const inputClasses = 
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 " +
  "dark:bg-gray-700 dark:text-white rounded-md " +
  "focus:outline-none focus:ring-blue-500 focus:border-blue-500";

export const inputDisabledClasses = 
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 " +
  "dark:bg-gray-700 dark:text-white rounded-md " +
  "focus:outline-none focus:ring-blue-500 focus:border-blue-500 " +
  "disabled:bg-gray-100 dark:disabled:bg-gray-600 " +
  "disabled:text-gray-500 dark:disabled:text-gray-400";

export const selectClasses = 
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 " +
  "dark:bg-gray-700 dark:text-white rounded-md " +
  "focus:outline-none focus:ring-blue-500 focus:border-blue-500";

export const textareaClasses = 
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 " +
  "dark:bg-gray-700 dark:text-white rounded-md " +
  "focus:outline-none focus:ring-blue-500 focus:border-blue-500";

export const checkboxClasses = 
  "rounded border-gray-300 text-blue-600 focus:ring-blue-500";

// ============================================================================
// LABELS & TEXT
// ============================================================================

export const labelClasses = 
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

export const headingClasses = 
  "text-2xl font-bold text-gray-900 dark:text-white";

export const subheadingClasses = 
  "text-lg font-semibold text-gray-900 dark:text-white";

export const bodyTextClasses = 
  "text-sm text-gray-600 dark:text-gray-400";

export const helpTextClasses = 
  "text-xs text-gray-500 dark:text-gray-400";

export const codeClasses = 
  "bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm font-mono";

// ============================================================================
// BUTTONS
// ============================================================================

export const buttonPrimaryClasses = 
  "bg-blue-600 text-white px-4 py-2 rounded-md font-semibold " +
  "hover:bg-blue-700 transition " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonSecondaryClasses = 
  "bg-gray-600 text-white px-4 py-2 rounded-md font-semibold " +
  "hover:bg-gray-700 transition " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonDangerClasses = 
  "bg-red-600 text-white px-4 py-2 rounded-md font-semibold " +
  "hover:bg-red-700 transition " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonSuccessClasses = 
  "bg-green-600 text-white px-4 py-2 rounded-md font-semibold " +
  "hover:bg-green-700 transition " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonWarningClasses = 
  "bg-orange-600 text-white px-4 py-2 rounded-md font-semibold " +
  "hover:bg-orange-700 transition " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonCancelClasses = 
  "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md " +
  "text-gray-700 dark:text-gray-200 " +
  "hover:bg-gray-50 dark:hover:bg-gray-700 transition";

export const buttonLinkClasses = 
  "text-blue-600 dark:text-blue-400 " +
  "hover:text-blue-800 dark:hover:text-blue-300 " +
  "font-medium";

export const buttonLinkEditClasses = 
  "text-blue-600 dark:text-blue-400 " +
  "hover:text-blue-800 dark:hover:text-blue-300 " +
  "font-medium";

export const buttonLinkDangerClasses = 
  "text-red-600 dark:text-red-400 " +
  "hover:text-red-800 dark:hover:text-red-300 " +
  "font-medium";

export const buttonLinkSuccessClasses = 
  "text-green-600 dark:text-green-400 " +
  "hover:text-green-800 dark:hover:text-green-300 " +
  "font-medium";

export const buttonLinkWarningClasses = 
  "text-orange-600 dark:text-orange-400 " +
  "hover:text-orange-800 dark:hover:text-orange-300 " +
  "font-medium";

// ============================================================================
// TABS
// ============================================================================

export const tabContainerClasses = 
  "mb-6 flex flex-wrap gap-2 bg-white dark:bg-gray-800 " +
  "p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700";

export const tabButtonActiveClasses = 
  "px-4 py-2 text-sm font-medium rounded-lg " +
  "bg-blue-100 dark:bg-blue-900/50 " +
  "text-blue-700 dark:text-blue-300 transition-colors";

export const tabButtonInactiveClasses = 
  "px-4 py-2 text-sm font-medium rounded-lg " +
  "text-gray-600 dark:text-gray-400 " +
  "hover:bg-gray-100 dark:hover:bg-gray-700 " +
  "hover:text-gray-900 dark:hover:text-gray-200 transition-colors";

export const mainTabActiveClasses = 
  "whitespace-nowrap px-4 py-2.5 rounded-lg font-semibold text-sm " +
  "bg-blue-600 dark:bg-blue-500 text-white shadow-md transition-all";

export const mainTabInactiveClasses = 
  "whitespace-nowrap px-4 py-2.5 rounded-lg font-medium text-sm " +
  "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 " +
  "hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md transition-all " +
  "border border-gray-200 dark:border-gray-700";

// ============================================================================
// CARDS & CONTAINERS
// ============================================================================

export const cardClasses = 
  "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6";

export const cardHeaderClasses = 
  "px-6 py-4 bg-gray-50 dark:bg-gray-700 " +
  "border-b border-gray-200 dark:border-gray-600";

export const modalBackdropClasses = 
  "fixed inset-0 bg-gray-900 bg-opacity-75 " +
  "flex items-center justify-center z-50 p-4";

export const modalClasses = 
  "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6";

export const modalTitleClasses = 
  "text-xl font-bold text-gray-900 dark:text-white mb-4";

// ============================================================================
// TABLES
// ============================================================================

export const tableClasses = 
  "min-w-full divide-y divide-gray-200 dark:divide-gray-700";

export const tableHeadClasses = 
  "bg-gray-50 dark:bg-gray-700";

export const tableHeaderCellClasses = 
  "px-6 py-3 text-left text-xs font-medium " +
  "text-gray-500 dark:text-gray-300 uppercase tracking-wider";

export const tableHeaderCellCenterClasses = 
  "px-6 py-3 text-center text-xs font-medium " +
  "text-gray-500 dark:text-gray-300 uppercase tracking-wider";

export const tableHeaderCellRightClasses = 
  "px-6 py-3 text-right text-xs font-medium " +
  "text-gray-500 dark:text-gray-300 uppercase tracking-wider";

export const tableBodyClasses = 
  "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700";

export const tableCellClasses = 
  "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white";

export const tableCellSecondaryClasses = 
  "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400";

// ============================================================================
// ALERTS & NOTIFICATIONS
// ============================================================================

export const alertInfoClasses = 
  "bg-blue-50 dark:bg-blue-900/30 " +
  "border-l-4 border-blue-500 dark:border-blue-400 p-4";

export const alertInfoTextClasses = 
  "text-sm text-blue-700 dark:text-blue-300";

export const alertSuccessClasses = 
  "bg-green-50 dark:bg-green-900/30 " +
  "border-l-4 border-green-500 dark:border-green-400 p-4";

export const alertSuccessTextClasses = 
  "text-sm text-green-700 dark:text-green-300";

export const alertWarningClasses = 
  "bg-yellow-50 dark:bg-yellow-900/30 " +
  "border-l-4 border-yellow-500 dark:border-yellow-400 p-4";

export const alertWarningTextClasses = 
  "text-sm text-yellow-700 dark:text-yellow-300";

export const alertErrorClasses = 
  "bg-red-50 dark:bg-red-900/30 " +
  "border-l-4 border-red-500 dark:border-red-400 p-4";

export const alertErrorTextClasses = 
  "text-sm text-red-700 dark:text-red-300";

// ============================================================================
// BADGES & TAGS
// ============================================================================

export const badgeClasses = 
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

export const badgePrimaryClasses = 
  badgeClasses + " bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";

export const badgeSuccessClasses = 
  badgeClasses + " bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";

export const badgeWarningClasses = 
  badgeClasses + " bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";

export const badgeDangerClasses = 
  badgeClasses + " bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";

export const badgeGrayClasses = 
  badgeClasses + " bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";

export const badgePurpleClasses = 
  badgeClasses + " bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";

// ============================================================================
// DIVIDERS
// ============================================================================

export const dividerClasses = 
  "border-t-2 border-gray-200 dark:border-gray-700";

// ============================================================================
// PAGE LAYOUT
// ============================================================================

export const pageContainerClasses = 
  "min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors";

export const sectionTitleClasses = 
  "text-lg font-semibold text-gray-900 dark:text-white mb-4";

