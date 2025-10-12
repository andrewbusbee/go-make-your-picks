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

