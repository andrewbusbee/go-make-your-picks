import { useEffect, useState } from 'react';
import api from '../../utils/api';
import TimezoneSelector from '../TimezoneSelector';
import {
  headingClasses,
  bodyTextClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  buttonCancelClasses,
  alertSuccessClasses,
  alertSuccessTextClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertInfoClasses,
  alertInfoTextClasses,
  helpTextClasses,
  dividerClasses,
  subheadingClasses,
  cardClasses
} from '../../styles/commonClasses';

export default function AppSettings() {
  const [appTitle, setAppTitle] = useState('');
  const [appTagline, setAppTagline] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [defaultTimezone, setDefaultTimezone] = useState('America/New_York');
  const [pointsFirstPlace, setPointsFirstPlace] = useState(6);
  const [pointsSecondPlace, setPointsSecondPlace] = useState(5);
  const [pointsThirdPlace, setPointsThirdPlace] = useState(4);
  const [pointsFourthPlace, setPointsFourthPlace] = useState(3);
  const [pointsFifthPlace, setPointsFifthPlace] = useState(2);
  const [pointsSixthPlusPlace, setPointsSixthPlusPlace] = useState(1);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalTagline, setOriginalTagline] = useState('');
  const [originalFooterMessage, setOriginalFooterMessage] = useState('');
  const [originalDefaultTimezone, setOriginalDefaultTimezone] = useState('America/New_York');
  const [originalPointsFirstPlace, setOriginalPointsFirstPlace] = useState(6);
  const [originalPointsSecondPlace, setOriginalPointsSecondPlace] = useState(5);
  const [originalPointsThirdPlace, setOriginalPointsThirdPlace] = useState(4);
  const [originalPointsFourthPlace, setOriginalPointsFourthPlace] = useState(3);
  const [originalPointsFifthPlace, setOriginalPointsFifthPlace] = useState(2);
  const [originalPointsSixthPlusPlace, setOriginalPointsSixthPlusPlace] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
      setAppTagline(res.data.app_tagline || 'Predict. Compete. Win.');
      setFooterMessage(res.data.footer_message || 'Built for Sports Fans');
      setDefaultTimezone(res.data.default_timezone || 'America/New_York');
      setPointsFirstPlace(parseInt(res.data.points_first_place) || 6);
      setPointsSecondPlace(parseInt(res.data.points_second_place) || 5);
      setPointsThirdPlace(parseInt(res.data.points_third_place) || 4);
      setPointsFourthPlace(parseInt(res.data.points_fourth_place) || 3);
      setPointsFifthPlace(parseInt(res.data.points_fifth_place) || 2);
      setPointsSixthPlusPlace(parseInt(res.data.points_sixth_plus_place) || 1);
      
      setOriginalTitle(res.data.app_title || 'Go Make Your Picks');
      setOriginalTagline(res.data.app_tagline || 'Predict. Compete. Win.');
      setOriginalFooterMessage(res.data.footer_message || 'Built for Sports Fans');
      setOriginalDefaultTimezone(res.data.default_timezone || 'America/New_York');
      setOriginalPointsFirstPlace(parseInt(res.data.points_first_place) || 6);
      setOriginalPointsSecondPlace(parseInt(res.data.points_second_place) || 5);
      setOriginalPointsThirdPlace(parseInt(res.data.points_third_place) || 4);
      setOriginalPointsFourthPlace(parseInt(res.data.points_fourth_place) || 3);
      setOriginalPointsFifthPlace(parseInt(res.data.points_fifth_place) || 2);
      setOriginalPointsSixthPlusPlace(parseInt(res.data.points_sixth_plus_place) || 1);
      
      setLoadingSettings(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setLoadingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate point values
    const pointValues = [
      { name: 'First place', value: pointsFirstPlace },
      { name: 'Second place', value: pointsSecondPlace },
      { name: 'Third place', value: pointsThirdPlace },
      { name: 'Fourth place', value: pointsFourthPlace },
      { name: 'Fifth place', value: pointsFifthPlace },
      { name: 'Sixth place and below', value: pointsSixthPlusPlace }
    ];

    for (const point of pointValues) {
      if (point.value < 0 || point.value > 20) {
        setError(`${point.name} points must be between 0 and 20`);
        return;
      }
    }

    setLoading(true);

    try {
      await api.put('/admin/settings', {
        appTitle,
        appTagline,
        footerMessage,
        defaultTimezone,
        pointsFirstPlace,
        pointsSecondPlace,
        pointsThirdPlace,
        pointsFourthPlace,
        pointsFifthPlace,
        pointsSixthPlusPlace
      });
      
      setSuccess('Settings updated successfully! Leaderboard scores will update automatically. Refresh the page to see the new scores.');
      setOriginalTitle(appTitle);
      setOriginalTagline(appTagline);
      setOriginalFooterMessage(footerMessage);
      setOriginalDefaultTimezone(defaultTimezone);
      setOriginalPointsFirstPlace(pointsFirstPlace);
      setOriginalPointsSecondPlace(pointsSecondPlace);
      setOriginalPointsThirdPlace(pointsThirdPlace);
      setOriginalPointsFourthPlace(pointsFourthPlace);
      setOriginalPointsFifthPlace(pointsFifthPlace);
      setOriginalPointsSixthPlusPlace(pointsSixthPlusPlace);
      
      // Force reload leaderboard data by triggering a re-render
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAppTitle(originalTitle);
    setAppTagline(originalTagline);
    setFooterMessage(originalFooterMessage);
    setDefaultTimezone(originalDefaultTimezone);
    setPointsFirstPlace(originalPointsFirstPlace);
    setPointsSecondPlace(originalPointsSecondPlace);
    setPointsThirdPlace(originalPointsThirdPlace);
    setPointsFourthPlace(originalPointsFourthPlace);
    setPointsFifthPlace(originalPointsFifthPlace);
    setPointsSixthPlusPlace(originalPointsSixthPlusPlace);
    setError('');
    setSuccess('');
  };

  const hasChanges = 
    appTitle !== originalTitle || 
    appTagline !== originalTagline ||
    footerMessage !== originalFooterMessage ||
    defaultTimezone !== originalDefaultTimezone ||
    pointsFirstPlace !== originalPointsFirstPlace ||
    pointsSecondPlace !== originalPointsSecondPlace ||
    pointsThirdPlace !== originalPointsThirdPlace ||
    pointsFourthPlace !== originalPointsFourthPlace ||
    pointsFifthPlace !== originalPointsFifthPlace ||
    pointsSixthPlusPlace !== originalPointsSixthPlusPlace;

  if (loadingSettings) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className={headingClasses + " mb-2"}>App Customization</h2>
      </div>

      <div className={`${cardClasses} shadow-md`}>
        {/* Info Box */}
        <div className={alertInfoClasses + " p-4 mb-6"}>
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className={alertInfoTextClasses + " font-medium mb-1"}>Customize Your App</p>
              <p className={alertInfoTextClasses}>
                These settings control the branding throughout the app, including the website header, footer, and email templates. 
                Changes take effect immediately but require a page refresh.
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className={alertSuccessClasses + " p-4 mb-6"}>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className={alertSuccessTextClasses + " text-sm"}>{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={alertErrorClasses + " p-4 mb-6"}>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className={alertErrorTextClasses + " text-sm"}>{error}</p>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
          <h3 className="text-sm font-semibold text-blue-200 mb-3">Preview</h3>
          <div className="flex items-center space-x-3">
            <span className="text-4xl">🏆</span>
            <div>
              <h1 className="text-2xl font-bold">{appTitle || 'Go Make Your Picks'}</h1>
              <p className="text-sm text-blue-100">{appTagline || 'Predict. Compete. Win.'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Settings - 2 column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="appTitle" className={labelClasses}>
                App Title
              </label>
              <input
                type="text"
                id="appTitle"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                placeholder="Go Make Your Picks"
                maxLength={100}
                className={inputClasses}
                required
              />
              <p className={bodyTextClasses + " mt-1 text-xs"}>
                Appears in the header and emails. Maximum 100 characters.
              </p>
            </div>

            <div>
              <label htmlFor="appTagline" className={labelClasses}>
                Tagline
              </label>
              <input
                type="text"
                id="appTagline"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="Predict. Compete. Win."
                maxLength={200}
                className={inputClasses}
                required
              />
              <p className={`mt-1 ${helpTextClasses}`}>
                Appears below the title. Maximum 200 characters.
              </p>
            </div>

            <div>
              <label htmlFor="footerMessage" className={labelClasses}>
                Footer Message
              </label>
              <input
                type="text"
                id="footerMessage"
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder="Built for Sports Fans"
                maxLength={200}
                className={inputClasses}
                required
              />
              <p className={`mt-1 ${helpTextClasses}`}>
                Appears in the footer on all pages. Maximum 200 characters.
              </p>
            </div>

            <div>
              <label htmlFor="defaultTimezone" className={labelClasses}>
                Default Timezone
              </label>
              <TimezoneSelector
                value={defaultTimezone}
                onChange={setDefaultTimezone}
                required
              />
              <p className={`mt-1 ${helpTextClasses}`}>
                This timezone will be used as the default when creating new sports. 
                You can change it for each individual sport if needed.
              </p>
            </div>

          </div>

          {/* Scoring Settings Section */}
          <div className={`pt-6 ${dividerClasses}`}>
            <h3 className={`${subheadingClasses} mb-4`}>Scoring Settings</h3>
            <p className={`${bodyTextClasses} mb-4`}>
              Customize point values for each placement. Changes apply to all rounds instantly.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="pointsFirstPlace" className={labelClasses}>
                  Champion (1st Place)
                </label>
                <input
                  type="number"
                  id="pointsFirstPlace"
                  value={pointsFirstPlace}
                  onChange={(e) => setPointsFirstPlace(parseInt(e.target.value) || 0)}
                  min="0"
                  max="20"
                  className={inputClasses}
                  required
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  Points for picking the champion (0-20)
                </p>
              </div>

              <div>
                <label htmlFor="pointsSecondPlace" className={labelClasses}>
                  Second Place
                </label>
                <input
                  type="number"
                  id="pointsSecondPlace"
                  value={pointsSecondPlace}
                  onChange={(e) => setPointsSecondPlace(parseInt(e.target.value) || 0)}
                  min="0"
                  max="20"
                  className={inputClasses}
                  required
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  Points for picking 2nd place (0-20)
                </p>
              </div>

              <div>
                <label htmlFor="pointsThirdPlace" className={labelClasses}>
                  Third Place
                </label>
                <input
                  type="number"
                  id="pointsThirdPlace"
                  value={pointsThirdPlace}
                  onChange={(e) => setPointsThirdPlace(parseInt(e.target.value) || 0)}
                  min="0"
                  max="20"
                  className={inputClasses}
                  required
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  Points for picking 3rd place (0-20)
                </p>
              </div>

              <div>
                <label htmlFor="pointsFourthPlace" className={labelClasses}>
                  Fourth Place
                </label>
                <input
                  type="number"
                  id="pointsFourthPlace"
                  value={pointsFourthPlace}
                  onChange={(e) => setPointsFourthPlace(parseInt(e.target.value) || 0)}
                  min="0"
                  max="20"
                  className={inputClasses}
                  required
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  Points for picking 4th place (0-20)
                </p>
              </div>

              <div>
                <label htmlFor="pointsFifthPlace" className={labelClasses}>
                  Fifth Place
                </label>
                <input
                  type="number"
                  id="pointsFifthPlace"
                  value={pointsFifthPlace}
                  onChange={(e) => setPointsFifthPlace(parseInt(e.target.value) || 0)}
                  min="0"
                  max="20"
                  className={inputClasses}
                  required
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  Points for picking 5th place (0-20)
                </p>
              </div>

              <div>
                <label htmlFor="pointsSixthPlusPlace" className={labelClasses}>
                  Sixth Place & Below
                </label>
                <input
                  type="number"
                  id="pointsSixthPlusPlace"
                  value={pointsSixthPlusPlace}
                  onChange={(e) => setPointsSixthPlusPlace(parseInt(e.target.value) || 0)}
                  min="0"
                  max="20"
                  className={inputClasses}
                  required
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  Points for all other players (0-20)
                </p>
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="text-yellow-900 dark:text-yellow-200 font-medium">Dynamic Scoring</p>
                  <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                    Changing these values will <strong>instantly update all leaderboard scores</strong> without needing to recalculate past rounds. 
                    Maximum points per round: {pointsFirstPlace} (1st) + {pointsSecondPlace} (2nd) + ... = up to {pointsFirstPlace} points for the winner.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className={`flex-1 ${buttonPrimaryClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                className={buttonCancelClasses}
              >
                Reset
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
