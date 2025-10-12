import {
  cardClasses,
  headingClasses,
  subheadingClasses,
  bodyTextClasses,
  buttonPrimaryClasses,
  buttonSuccessClasses,
  badgeSuccessClasses,
  alertInfoClasses,
  alertInfoTextClasses,
  formSectionLargeClasses,
  textCenterClasses,
  gridThreeColClasses,
  flexJustifyBetweenClasses,
  mb3Classes,
  flexItemsStartClasses,
  gridThreeColMdClasses,
  formSectionClasses,
  flexGapClasses,
  flexCenterClasses,
  mb2Classes,
  mt1Classes
} from '../../styles/commonClasses';

interface GettingStartedProps {
  onNavigate: (path: string) => void;
  hasPlayers: boolean;
  hasSeasons: boolean;
  hasSports: boolean;
}

export default function GettingStarted({ onNavigate, hasPlayers, hasSeasons, hasSports }: GettingStartedProps) {
  const isSetupComplete = hasPlayers && hasSeasons && hasSports;
  
  const setupSteps = [
    {
      id: 'players',
      title: '1. Add Players',
      description: 'Create user accounts for people who will participate in the picks competition.',
      completed: hasPlayers,
      action: () => onNavigate('/admin/users'),
      buttonText: hasPlayers ? 'Manage Players' : 'Add Players',
      buttonClass: hasPlayers ? buttonSuccessClasses : buttonPrimaryClasses,
      details: [
        'Add player names and email addresses',
        'Players will receive magic links to make picks',
        'Only active players can participate in seasons'
      ]
    },
    {
      id: 'seasons',
      title: '2. Create Seasons',
      description: 'Set up competition periods where players will compete across multiple sports.',
      completed: hasSeasons,
      action: () => onNavigate('/admin/seasons'),
      buttonText: hasSeasons ? 'Manage Seasons' : 'Create Season',
      buttonClass: hasSeasons ? buttonSuccessClasses : buttonPrimaryClasses,
      details: [
        'Define season name and date range',
        'Select which players participate',
        'Seasons can run concurrently',
        'One season is marked as default for reporting'
      ]
    },
    {
      id: 'sports',
      title: '3. Add Sports',
      description: 'Create individual sports competitions within your seasons.',
      completed: hasSports,
      action: () => onNavigate('/admin/rounds'),
      buttonText: hasSports ? 'Manage Sports' : 'Add Sports',
      buttonClass: hasSports ? buttonSuccessClasses : buttonPrimaryClasses,
      details: [
        'Choose sport type (single pick, multi-pick, etc.)',
        'Set lock times for when picks are due',
        'Add teams/options for players to choose from',
        'Configure scoring system and point values'
      ]
    }
  ];

  const features = [
    {
      title: 'Magic Link System',
      description: 'Players receive email links to make their picks - no passwords required!',
      icon: '📧'
    },
    {
      title: 'Real-time Leaderboards',
      description: 'Live scoring and cumulative points tracking with interactive graphs.',
      icon: '📊'
    },
    {
      title: 'Flexible Scoring',
      description: 'Customize point values for different placement finishes (1st, 2nd, 3rd, etc.).',
      icon: '⚡'
    },
    {
      title: 'Multiple Seasons',
      description: 'Run concurrent seasons with different participants and sports.',
      icon: '🏆'
    },
    {
      title: 'Email Reminders',
      description: 'Automatic 48-hour and 6-hour reminders before pick deadlines.',
      icon: '⏰'
    },
    {
      title: 'Season Management',
      description: 'End seasons, crown winners, and maintain historical records.',
      icon: '🎯'
    }
  ];

  return (
    <div className={formSectionLargeClasses}>
      {/* Header */}
      <div className={textCenterClasses}>
        <h1 className={`${headingClasses} text-4xl mb-4`}>🏆 Getting Started</h1>
        <p className={`${bodyTextClasses} text-lg max-w-3xl mx-auto`}>
          Welcome to Go Make Your Picks! Follow these steps to set up your sports picks competition.
          This guide will walk you through creating your first season with players and sports.
        </p>
      </div>

      {/* Setup Progress */}
      <div className={`${cardClasses} p-6`}>
        <h2 className={`${subheadingClasses} mb-4 flex items-center gap-2`}>
          Setup Progress
          {isSetupComplete && <span className={`${badgeSuccessClasses} text-xs`}>Complete!</span>}
        </h2>
        
        <div className={gridThreeColClasses}>
          {setupSteps.map((step) => (
            <div key={step.id} className={`p-4 rounded-lg border-2 flex flex-col ${
              step.completed 
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
            }`}>
              <div className={`${flexJustifyBetweenClasses} ${mb3Classes}`}>
                <h3 className={`${subheadingClasses} text-lg flex items-center gap-2`}>
                  {step.title}
                  {step.completed && (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  )}
                </h3>
                {step.completed && (
                  <span className={`${badgeSuccessClasses} text-xs`}>Done</span>
                )}
              </div>
              
              <p className={`${bodyTextClasses} mb-4`}>{step.description}</p>
              
              <ul className={`${bodyTextClasses} text-sm mb-4 space-y-1 flex-grow`}>
                {step.details.map((detail, index) => (
                  <li key={index} className={`${flexItemsStartClasses} gap-2`}>
                    <span className={`text-gray-400 dark:text-gray-500 ${mt1Classes}`}>•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={step.action}
                className={`w-full ${step.buttonClass} mt-auto`}
              >
                {step.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Features Overview */}
      <div className={`${cardClasses} p-6`}>
        <h2 className={`${subheadingClasses} mb-4`}>Key Features</h2>
        <div className={gridThreeColMdClasses}>
          {features.map((feature, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className={`${flexCenterClasses} gap-3 ${mb2Classes}`}>
                <span className="text-2xl">{feature.icon}</span>
                <h3 className={`${subheadingClasses} text-lg`}>{feature.title}</h3>
              </div>
              <p className={bodyTextClasses}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Guide */}
      <div className={`${cardClasses} p-6`}>
        <h2 className={`${subheadingClasses} mb-4`}>Typical Workflow</h2>
        
        <div className={formSectionClasses}>
          <div className={flexGapClasses}>
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className={`${subheadingClasses} text-lg`}>Setup Phase</h4>
              <p className={bodyTextClasses}>
                Add players, create a season, and set up your first sports competitions. 
                Configure scoring and lock times.
              </p>
            </div>
          </div>
          
          <div className={flexGapClasses}>
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className={`${subheadingClasses} text-lg`}>Active Competition</h4>
              <p className={bodyTextClasses}>
                Players receive magic links via email to make their picks. 
                Monitor the leaderboard as results come in.
              </p>
            </div>
          </div>
          
          <div className={flexGapClasses}>
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className={`${subheadingClasses} text-lg`}>Results & Winners</h4>
              <p className={bodyTextClasses}>
                Enter results for completed sports. End seasons to crown winners 
                and maintain historical records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help & Support */}
      <div className={`${alertInfoClasses} p-4`}>
        <h3 className={`${subheadingClasses} mb-2`}>Need Help?</h3>
        <p className={alertInfoTextClasses}>
          Each section in the admin panel has detailed instructions and tooltips. 
          Start with the setup steps above, and feel free to explore the other admin sections 
          as you become more familiar with the system.
        </p>
      </div>
    </div>
  );
}
