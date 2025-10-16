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

export const labelInlineClasses = 
  "text-sm font-medium text-gray-700 dark:text-gray-300";

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
// GRADIENT BUTTONS
// ============================================================================

export const buttonGradientPrimaryClasses = 
  "w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white " +
  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 " +
  "focus:outline-none focus:ring-4 focus:ring-blue-300 " +
  "disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]";

export const buttonGradientSecondaryClasses = 
  "flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-semibold " +
  "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 " +
  "hover:bg-gray-50 dark:hover:bg-gray-600 " +
  "focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all";

export const buttonGradientPrimaryFlexClasses = 
  "flex-[2] flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white " +
  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 " +
  "focus:outline-none focus:ring-4 focus:ring-blue-300 " +
  "disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]";

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
  "bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 " +
  "max-h-[90vh] overflow-y-auto";

export const modalTitleClasses = 
  "text-xl font-bold text-gray-900 dark:text-white mb-4";

// ============================================================================
// TABLES
// ============================================================================

export const tableClasses = 
  "min-w-full divide-y divide-gray-200 dark:divide-gray-700";

export const tableContainerClasses = 
  "overflow-x-auto -mx-4 sm:mx-0";

export const tableHeadClasses = 
  "bg-gray-50 dark:bg-gray-700";

export const tableHeaderCellClasses = 
  "px-3 sm:px-6 py-3 text-left text-xs font-medium " +
  "text-gray-500 dark:text-gray-300 uppercase tracking-wider";

export const tableHeaderCellCenterClasses = 
  "px-3 sm:px-6 py-3 text-center text-xs font-medium " +
  "text-gray-500 dark:text-gray-300 uppercase tracking-wider";

export const tableHeaderCellRightClasses = 
  "px-3 sm:px-6 py-3 text-right text-xs font-medium " +
  "text-gray-500 dark:text-gray-300 uppercase tracking-wider";

export const tableBodyClasses = 
  "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700";

export const tableCellClasses = 
  "px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white";

export const tableCellSecondaryClasses = 
  "px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400";

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

// ============================================================================
// PARTICIPANT & LEADERBOARD LISTS
// ============================================================================

export const participantSectionClasses = 
  "mb-3 border-t border-gray-200 dark:border-gray-700 pt-3";

export const participantHeaderClasses = 
  "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";

export const participantListClasses = 
  "space-y-1";

export const participantItemClasses = 
  "flex items-center text-sm text-gray-600 dark:text-gray-400";

export const participantCheckmarkClasses = 
  "mr-2";

export const leaderboardSectionClasses = 
  "mb-4 border-t border-gray-200 dark:border-gray-700 pt-3";

export const leaderboardHeaderClasses = 
  "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";

export const leaderboardListClasses = 
  "space-y-1 max-h-48 overflow-y-auto";

export const leaderboardItemClasses = 
  "flex items-center justify-between text-sm text-gray-600 dark:text-gray-400";

export const leaderboardRankClasses = 
  "font-medium text-gray-500 dark:text-gray-500 w-6";

export const leaderboardScoreClasses = 
  "font-semibold text-blue-600 dark:text-blue-400";

export const leaderboardNameContainerClasses = 
  "flex items-center gap-2";

// ============================================================================
// FORM SECTIONS & SPACING
// ============================================================================

export const formSectionClasses = 
  "space-y-4";

export const formSectionSpacingSmallClasses = 
  "space-y-2";

export const formSectionSpacingLargeClasses = 
  "space-y-6";

export const formGridTwoColClasses = 
  "grid grid-cols-1 md:grid-cols-2 gap-4";

// ============================================================================
// RADIO & CHECKBOX GROUPS
// ============================================================================

export const radioGroupClasses = 
  "space-y-2";

export const radioLabelClasses = 
  "flex items-center";

export const radioInputClasses = 
  "mr-2";

export const radioTextClasses = 
  "text-sm text-gray-900 dark:text-gray-100";

// ============================================================================
// LAYOUT UTILITIES
// ============================================================================

export const flexCenterClasses = 
  "flex items-center";

export const flexBetweenClasses = 
  "flex items-center justify-between";

export const flexWrapGapClasses = 
  "flex flex-wrap gap-2";

export const gridTwoColClasses = 
  "grid gap-4 md:grid-cols-2";

export const gridThreeColClasses = 
  "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

export const flexColumnClasses = 
  "flex flex-col";

export const flexColumnGapClasses = 
  "flex flex-col gap-1";

export const flexRowClasses = 
  "flex";

export const flexGapClasses = 
  "flex gap-3";

export const flexJustifyBetweenClasses = 
  "flex justify-between items-center";

export const flexJustifyBetweenStartClasses = 
  "flex justify-between items-start";

export const flexSpaceXClasses = 
  "flex space-x-3";

export const flexSpaceXPtClasses = 
  "flex space-x-3 pt-4";

export const flexItemsGapClasses = 
  "flex items-center space-x-3";

export const flexItemsGap1Classes = 
  "flex items-center gap-1";

// ============================================================================
// SPACING UTILITIES
// ============================================================================

export const mb2Classes = "mb-2";
export const mb3Classes = "mb-3";
export const mb4Classes = "mb-4";
export const mb6Classes = "mb-6";
export const mt1Classes = "mt-1";
export const mt4Classes = "mt-4";
export const pt3Classes = "pt-3";
export const pt4Classes = "pt-4";
export const pt6Classes = "pt-6";

// ============================================================================
// RESPONSIVE LAYOUTS
// ============================================================================

export const responsiveFlexHeaderClasses = 
  "flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4";

// ============================================================================
// BUTTON SIZE VARIANTS
// ============================================================================

export const buttonSmallClasses = 
  "text-sm px-3 py-1 rounded";

export const buttonSmallPrimaryClasses = 
  "text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition font-semibold disabled:opacity-50";

export const buttonSmallSuccessClasses = 
  "text-sm px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition font-semibold disabled:opacity-50";

export const buttonSmallWarningClasses = 
  "text-sm px-3 py-1 rounded bg-orange-600 text-white hover:bg-orange-700 transition font-semibold disabled:opacity-50";

export const buttonSmallSecondaryClasses = 
  "text-sm px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700 transition font-semibold disabled:opacity-50";

export const buttonSmallPurpleClasses = 
  "text-sm px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 transition font-semibold disabled:opacity-50";

export const buttonSmallYellowClasses = 
  "text-sm px-3 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700 transition font-semibold disabled:opacity-50";

export const buttonSmallDangerLinkClasses = 
  "text-sm text-red-600 hover:text-red-800 font-medium";

export const buttonXSmallClasses = 
  "text-xs py-2 px-3 rounded-md transition font-medium";

// ============================================================================
// MODAL & OVERLAY
// ============================================================================

export const modalOverlayClasses = 
  "fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto";

export const modalContentLargeClasses = 
  "max-w-4xl w-full my-2 sm:my-8 max-h-[95vh] overflow-y-auto";

export const modalContentMediumClasses = 
  "max-w-2xl w-full my-2 sm:my-8 max-h-[95vh] overflow-y-auto";

// ============================================================================
// HOVER & INTERACTIVE STATES
// ============================================================================

export const hoverCardClasses = 
  "hover:shadow-lg transition";

export const interactiveListItemClasses = 
  "flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0";

// ============================================================================
// ICON & EMOJI CONTAINERS
// ============================================================================

export const iconLargeClasses = 
  "text-4xl mb-4";

export const checkboxLabelClasses = 
  "flex items-center gap-3 cursor-pointer";

// ============================================================================
// UTILITY TEXT CLASSES
// ============================================================================

export const textMediumClasses = 
  "font-medium";

export const textCapitalizeClasses = 
  "capitalize";

export const textRedClasses = 
  "text-red-600 dark:text-red-400";

export const textGrayItalicClasses = 
  "text-gray-400 dark:text-gray-500 italic";

export const textBlueInfoClasses = 
  "text-xs text-blue-900 dark:text-blue-100";

export const textSmallClasses = 
  "text-sm";

export const textCenterClasses = 
  "text-center";

export const textXsGrayClasses = 
  "text-xs text-gray-500 dark:text-gray-400";

export const textXsGrayNormalClasses = 
  "text-xs text-gray-500 dark:text-gray-400 font-normal";

// ============================================================================
// SPACING WITH COLORS
// ============================================================================

export const mlSpacingClasses = 
  "ml-2";

export const infoBoxClasses = 
  "bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md mb-3";

export const grayInfoBoxClasses = 
  "mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md";

export const grayInfoTextClasses = 
  "text-sm text-gray-600 dark:text-gray-300";

export const spacingYClasses = 
  "space-y-3";

// ============================================================================
// MODAL VARIANTS
// ============================================================================

export const modalOverlayGrayClasses = 
  "fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4";

// ============================================================================
// CONTAINER & PAGE LAYOUT
// ============================================================================

export const containerClasses = 
  "container mx-auto px-4 py-8";

export const containerCenterClasses = 
  "container mx-auto px-4 py-8 text-center";

// ============================================================================
// LOADING & EMPTY STATES
// ============================================================================

export const loadingCenterClasses = 
  "text-center py-8";

export const loadingTextClasses = 
  "text-gray-500 dark:text-gray-400";

// ============================================================================
// GRID VARIANTS
// ============================================================================

export const gridTwoColLgClasses = 
  "grid grid-cols-1 lg:grid-cols-2 gap-6";

export const gridTwoColMdClasses = 
  "grid grid-cols-1 md:grid-cols-2 gap-6";

export const gridThreeColMdClasses = 
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

export const gridFourColClasses = 
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";

// ============================================================================
// FORM SPACING VARIANTS
// ============================================================================

export const formSectionLargeClasses = 
  "space-y-6";

// ============================================================================
// FLEX VARIANTS
// ============================================================================

export const flexItemsStartClasses = 
  "flex items-start";

export const flexColCenterClasses = 
  "flex flex-col items-center";

export const flexColCenterGapClasses = 
  "flex flex-col items-center gap-1";

export const flexJustifyCenterClasses = 
  "flex justify-center items-end gap-2 sm:gap-3 md:gap-4";

// ============================================================================
// LOGIN PAGE SPECIFIC
// ============================================================================

export const loginFormClasses = 
  "space-y-6";

export const loginButtonContainerClasses = 
  "flex gap-3";

export const loginBackLinkClasses = 
  "text-sm font-medium text-blue-600 hover:text-blue-500 transition";

export const loginIconRedClasses = 
  "h-5 w-5 text-red-400 dark:text-red-300";

export const loginIconGreenClasses = 
  "h-5 w-5 text-green-400";

export const loginLoadingSpinnerClasses = 
  "animate-spin -ml-1 mr-3 h-5 w-5 text-white";

// ============================================================================
// OVERFLOW & SCROLLING
// ============================================================================

export const overflowXAutoClasses = 
  "overflow-x-auto";

export const overflowYAutoClasses = 
  "overflow-y-auto";

// ============================================================================
// SVG & ICON UTILITIES
// ============================================================================

export const svgIconSmallClasses = 
  "w-5 h-5 mt-0.5 mr-3 flex-shrink-0";

export const svgIconBlueClasses = 
  "w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0";

export const svgIconGreenClasses = 
  "w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0";

export const svgIconRedClasses = 
  "w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0";

export const svgIconYellowClasses = 
  "w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0";

export const iconMediumClasses = 
  "text-4xl";

export const iconXLargeClasses = 
  "text-8xl";

export const iconFiveXLClasses = 
  "text-5xl";

// ============================================================================
// TABLE ROW STATES
// ============================================================================

export const tableRowHoverClasses = 
  "hover:bg-gray-50 dark:hover:bg-gray-700";

// ============================================================================
// PREVIEW & GRADIENT BOXES
// ============================================================================

export const previewBoxGradientClasses = 
  "mb-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-lg text-white";

export const previewHeaderClasses = 
  "text-sm font-semibold text-blue-200 dark:text-blue-300 mb-3";

export const previewTitleClasses = 
  "text-2xl font-bold";

export const previewTextClasses = 
  "text-sm text-blue-100 dark:text-blue-200";

// ============================================================================
// WARNING BOX VARIANTS
// ============================================================================

export const warningBoxYellowClasses = 
  "mt-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500 p-4";

export const warningTextYellowClasses = 
  "text-yellow-900 dark:text-yellow-200";

export const warningTextYellowSecondaryClasses = 
  "text-yellow-700 dark:text-yellow-300";

// ============================================================================
// SPACING ADDITIONS
// ============================================================================

export const mt2Classes = "mt-2";
export const mt3Classes = "mt-3";

// ============================================================================
// ADDITIONAL UTILITY CLASSES
// ============================================================================

export const shadowClasses = "shadow-md";
export const flex1Classes = "flex-1";
export const disabledOpacityClasses = "disabled:opacity-50 disabled:cursor-not-allowed";
export const p4Classes = "p-4";
export const mb1Classes = "mb-1";
export const textXsClasses = "text-xs";

// Time input with lighter picker button in dark mode
export const timeInputClasses = 
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 " +
  "dark:bg-gray-700 dark:text-white rounded-md " +
  "focus:outline-none focus:ring-blue-500 focus:border-blue-500 " +
  "[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:opacity-80";

// Theme toggle button - smaller size
export const themeToggleButtonClasses = 
  "bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 text-lg";

// ============================================================================
// APP CUSTOMIZATION SECTION (Getting Started)
// ============================================================================

// Main customization section wrapper
export const customizationSectionClasses = 
  "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6";

// Header with title and action button
export const customizationHeaderClasses = 
  "flex justify-between items-center mb-4";

// Title with icon
export const customizationTitleClasses = 
  "text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2";

// Description paragraph
export const customizationDescriptionClasses = 
  "text-sm text-gray-600 dark:text-gray-400 mb-6";

// Three column grid for features
export const featureGridThreeColClasses = 
  "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4";

// Individual feature card
export const featureCardClasses = 
  "p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600";

// Feature card title with icon
export const featureCardTitleClasses = 
  "text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2";

// Feature card subtitle
export const featureCardSubtitleClasses = 
  "text-sm text-gray-600 dark:text-gray-400 mb-3";

// Bullet list in feature cards
export const featureCardListClasses = 
  "space-y-1.5";

// Individual list items in feature cards
export const featureCardListItemClasses = 
  "text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2";

// List bullet point
export const featureCardBulletClasses = 
  "text-gray-400 dark:text-gray-500 mt-0.5";

// Pro tip info box
export const proTipBoxClasses = 
  "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-r-lg";

// Pro tip text
export const proTipTextClasses = 
  "text-sm text-blue-900 dark:text-blue-100 flex items-start gap-2";

// Pro tip icon
export const proTipIconClasses = 
  "text-blue-600 dark:text-blue-400 text-lg flex-shrink-0";

// ============================================================================
// CUSTOMIZATION COMPLETION INDICATORS
// ============================================================================

// Feature card with customization completion styling
export const featureCardCustomizedClasses = 
  "p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800";

// Feature card title with completion checkmark
export const featureCardTitleCustomizedClasses = 
  "text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2";

// Customization completion badge
export const customizationBadgeClasses = 
  "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full font-medium";

// Completion checkmark
export const completionCheckmarkClasses = 
  "text-green-600 dark:text-green-400 text-lg";

// Feature card with default styling (regular border)
export const featureCardDefaultClasses = 
  "p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600";

// Feature card title for default state (no checkmark)
export const featureCardTitleDefaultClasses = 
  "text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2";

// Default badge styling
export const defaultBadgeClasses = 
  "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium";

// ============================================================================
// SPORTS MANAGEMENT SECTION STYLING
// ============================================================================

// Section container with divider
export const sectionWithDividerClasses = 
  "mt-12 pt-8 border-t-2 border-gray-200 dark:border-gray-700";

// Completed sports section header
export const completedSectionHeaderClasses = 
  "text-lg font-semibold text-gray-900 dark:text-white mb-4";

// Completed sports card styling
export const completedSportsCardClasses = 
  "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 opacity-75";

// Active sports section header  
export const activeSectionHeaderClasses = 
  "text-lg font-semibold text-gray-900 dark:text-white mb-4";

// Activation warning message (for incomplete sports)
export const activationWarningClasses = 
  "text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-start gap-1";

// Activation info message (for complete sports ready to activate)
export const activationInfoClasses = 
  "text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-start gap-1";

// Copy sports section styling
export const copySportsSectionClasses = 
  "border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-gray-50 dark:bg-gray-800/50";

export const copySportsDropdownClasses = 
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export const copySportsWarningClasses = 
  "text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1";

// ============================================================================
// ADMIN PICK EDIT TRACKING
// ============================================================================

// Container for admin edit tracking display (flex column layout)
export const adminEditContainerClasses = 
  "flex flex-col gap-1";

// Checkmark icon for admin edited picks
export const adminEditCheckmarkClasses = 
  "text-green-600 dark:text-green-400";

// Pick change display (Line 1: "Eagles → Chiefs")
export const adminEditPickChangeClasses = 
  "text-sm font-normal text-gray-900 dark:text-gray-100";

// Metadata display (Line 2: "Edited by Admin on MM/DD/YYYY")
export const adminEditMetadataClasses = 
  "text-xs text-gray-500 dark:text-gray-400 mt-1";

// ============================================================================
// CHAMPIONS WALL PLAQUE STYLING
// ============================================================================

// Champions wall container with wooden background (removed - now using standard page layout)
// Wood grain texture overlay (removed - no longer needed with full-page layout)

// Champions wall title
export const championsWallTitleClasses = 
  "text-4xl md:text-5xl font-bold text-center text-gray-900 dark:text-white mb-8 " +
  "drop-shadow-lg tracking-wide";

// Large header brass plate (2 columns wide)
// Antique brass plate background
export const championsHeaderPlateClasses = 
  "rounded-lg p-6 md:p-8 mx-auto mb-8 col-span-2 text-center relative overflow-hidden " +
  "border border-amber-200 " +
  "[background:linear-gradient(180deg,#d7c088_0%,#c2a162_40%,#9a763a_64%,#7b5a23_78%,#cfb873_100%),radial-gradient(100%_60%_at_50%_0%,rgba(255,255,255,.14),transparent_60%),linear-gradient(180deg,transparent_0_60%,rgba(0,0,0,.07)_60%,transparent_61%)] " +
  "shadow-lg";

// Brass plate sheen effect
export const brassPlateSheenClasses = 
  "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full animate-pulse";

// Header plate title
export const championsHeaderTitleClasses = 
  "text-2xl md:text-3xl font-bold mb-2 text-black font-cinzel-decorative engraved-text";

// Header plate tagline
export const championsHeaderTaglineClasses = 
  "text-base md:text-lg font-semibold text-black font-cinzel-decorative engraved-text";

// Header plate info
export const championsHeaderInfoClasses = 
  "text-base md:text-lg text-black space-y-1 font-cinzel-decorative engraved-text";

// Individual champion brass plate
export const championPlateClasses = 
  "rounded-lg p-4 h-24 md:h-28 flex flex-col justify-center items-center text-center relative overflow-hidden " +
  "[background:linear-gradient(180deg,#d7c088_0%,#c2a162_40%,#9a763a_64%,#7b5a23_78%,#cfb873_100%),radial-gradient(100%_60%_at_50%_0%,rgba(255,255,255,.14),transparent_60%),linear-gradient(180deg,transparent_0_60%,rgba(0,0,0,.07)_60%,transparent_61%)] " +
  "border border-amber-200";

// Champion name on plate
export const championNameClasses = 
  "text-xl md:text-2xl font-bold leading-tight mb-1 text-black font-cormorant-sc engraved-text";

// Champion year on plate
export const championYearClasses = 
  "text-xl md:text-2xl font-semibold text-black font-cormorant-sc engraved-text";

// Champions grid container - Fixed 4 columns, 6 rows (24 plates total)
export const championsGridClasses = 
  "grid grid-cols-4 gap-4 md:gap-6 " +
  "max-w-6xl mx-auto";

// Empty champion plate (for initial 24 empty slots)
export const emptyChampionPlateClasses = 
  "rounded-lg p-4 h-24 md:h-28 flex flex-col justify-center items-center text-center relative overflow-hidden " +
  "bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400 dark:border-gray-500 " +
  "opacity-50";

// Empty plate text
export const emptyPlateTextClasses = 
  "text-sm text-gray-500 dark:text-gray-400 font-cormorant-sc";

// Champions empty state
export const championsEmptyStateClasses = 
  "text-center py-16";

// Champions empty state text
export const championsEmptyStateTextClasses = 
  "text-gray-600 dark:text-gray-400 text-lg mb-4";

// Champions button (for navigation)
export const championsButtonClasses = 
  "bg-gradient-to-r from-yellow-600 to-amber-600 " +
  "text-white px-4 py-2 rounded-lg font-semibold " +
  "shadow-lg shadow-yellow-900/30";

// ============================================================================
// MOBILE NAVIGATION STYLES
// ============================================================================

// Mobile hamburger button
export const mobileHamburgerButtonClasses = 
  "md:hidden bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 " +
  "transition-all duration-200 text-white";

// Mobile hamburger icon (three lines)
export const mobileHamburgerIconClasses = 
  "w-6 h-6";

// Mobile dropdown menu container
export const mobileDropdownMenuClasses = 
  "md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 " +
  "shadow-lg border-t border-gray-200 dark:border-gray-700 " +
  "transition-all duration-300 ease-in-out z-50";

// Mobile dropdown menu item
export const mobileDropdownMenuItemClasses = 
  "block w-full text-left px-4 py-3 text-gray-700 dark:text-gray-300 " +
  "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 " +
  "border-b border-gray-100 dark:border-gray-700 last:border-b-0";

// Mobile dropdown menu item with icon
export const mobileDropdownMenuItemWithIconClasses = 
  "flex items-center gap-3";

// Mobile dropdown menu item icon
export const mobileDropdownMenuItemIconClasses = 
  "w-5 h-5";

// Mobile dropdown menu item text
export const mobileDropdownMenuItemTextClasses = 
  "font-medium";

// Mobile dropdown menu item with special styling (Champions)
export const mobileDropdownMenuItemSpecialClasses = 
  "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 " +
  "text-yellow-800 dark:text-yellow-200 font-semibold";

// Mobile dropdown menu item with admin styling
export const mobileDropdownMenuItemAdminClasses = 
  "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold";

// Mobile dropdown menu item with theme toggle styling
export const mobileDropdownMenuItemThemeClasses = 
  "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium";

// Mobile header container with relative positioning for dropdown
export const mobileHeaderContainerClasses = 
  "relative";

// Mobile logo container (centered on mobile)
export const mobileLogoContainerClasses = 
  "flex items-center justify-center md:justify-start md:flex-none";

// Mobile navigation container (hidden on mobile, shown on desktop)
export const mobileNavigationDesktopClasses = 
  "hidden md:flex items-center space-x-3";

// Mobile navigation button container (shown on mobile, hidden on desktop)
export const mobileNavigationMobileClasses = 
  "md:hidden flex items-center";

// ============================================================================
// CHAMPIONS PAGE LAYOUT STYLES
// ============================================================================

// Champions page container
export const championsPageContainerClasses = 
  "container mx-auto px-4 py-8";

// Champions header plate container
export const championsHeaderPlateContainerClasses = 
  "max-w-4xl mx-auto mb-12";

// Champions loading/error state container
export const championsLoadingContainerClasses = 
  "flex items-center justify-center min-h-[50vh]";

// Champions loading text
export const championsLoadingTextClasses = 
  "text-gray-600 dark:text-gray-400 text-xl";

// Champions error text
export const championsErrorTextClasses = 
  "text-red-600 dark:text-red-400 text-xl text-center";

// Champions try again button
export const championsTryAgainButtonClasses = 
  "mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition";

// Champions no data text
export const championsNoDataTextClasses = 
  "text-gray-600 dark:text-gray-400 text-xl";

// Champions empty state icon
export const championsEmptyStateIconClasses = 
  "text-6xl mb-4";

// ============================================================================
// FONT FAMILY CLASSES FOR CHAMPIONS PAGE
// ============================================================================

export const fontCinzelDecorativeClasses = 
  "font-cinzel-decorative";

export const fontCormorantSCClasses = 
  "font-cormorant-sc";

export const fontItaliannoClasses = 
  "font-italianno";

// ============================================================================
// ENGRAVED TEXT EFFECTS
// ============================================================================

export const engravedTextClasses = 
  "engraved-text";

// ============================================================================
// SCREW/NAIL EFFECTS FOR PLAQUES
// ============================================================================

export const screwClasses = 
  "absolute w-2.5 h-2.5 rounded-full " +
  "bg-gray-500 " +
  "shadow-[inset_0_1px_1px_#ffffff,inset_0_-1px_2px_#333333] " +
  "border border-gray-600";

export const screwTopLeftClasses = 
  screwClasses + " top-2.5 left-2.5";

export const screwTopRightClasses = 
  screwClasses + " top-2.5 right-2.5";

export const screwBottomLeftClasses = 
  screwClasses + " bottom-2.5 left-2.5";

export const screwBottomRightClasses = 
  screwClasses + " bottom-2.5 right-2.5";

