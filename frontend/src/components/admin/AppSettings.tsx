import { useEffect, useState } from 'react';
import api from '../../utils/api';
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
  cardClasses,
  loadingCenterClasses,
  loadingTextClasses,
  mb6Classes,
  flexItemsStartClasses,
  svgIconBlueClasses,
  svgIconGreenClasses,
  svgIconRedClasses,
  svgIconYellowClasses,
  previewBoxGradientClasses,
  previewHeaderClasses,
  iconMediumClasses,
  flexItemsGapClasses,
  previewTitleClasses,
  previewTextClasses,
  formSectionLargeClasses,
  gridTwoColLgClasses,
  gridThreeColMdClasses,
  warningBoxYellowClasses,
  warningTextYellowClasses,
  warningTextYellowSecondaryClasses,
  flexSpaceXPtClasses,
  textSmallClasses,
  textMediumClasses,
  textXsClasses,
  mt1Classes,
  mb1Classes,
  mb2Classes,
  mb4Classes,
  pt6Classes,
  shadowClasses,
  flex1Classes,
  disabledOpacityClasses,
  p4Classes
} from '../../styles/commonClasses';

export default function AppSettings() {
  const [appTitle, setAppTitle] = useState('');
  const [appTagline, setAppTagline] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [themeMode, setThemeMode] = useState<'dark_only' | 'light_only' | 'user_choice'>('user_choice');
  const [pointsFirstPlace, setPointsFirstPlace] = useState(6);
  const [pointsSecondPlace, setPointsSecondPlace] = useState(5);
  const [pointsThirdPlace, setPointsThirdPlace] = useState(4);
  const [pointsFourthPlace, setPointsFourthPlace] = useState(3);
  const [pointsFifthPlace, setPointsFifthPlace] = useState(2);
  const [pointsSixthPlusPlace, setPointsSixthPlusPlace] = useState(1);
  const [pointsNoPick, setPointsNoPick] = useState(0);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalTagline, setOriginalTagline] = useState('');
  const [originalFooterMessage, setOriginalFooterMessage] = useState('');
  const [originalThemeMode, setOriginalThemeMode] = useState<'dark_only' | 'light_only' | 'user_choice'>('user_choice');
  const [originalPointsFirstPlace, setOriginalPointsFirstPlace] = useState(6);
  const [originalPointsSecondPlace, setOriginalPointsSecondPlace] = useState(5);
  const [originalPointsThirdPlace, setOriginalPointsThirdPlace] = useState(4);
  const [originalPointsFourthPlace, setOriginalPointsFourthPlace] = useState(3);
  const [originalPointsFifthPlace, setOriginalPointsFifthPlace] = useState(2);
  const [originalPointsNoPick, setOriginalPointsNoPick] = useState(0);
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
      
      // Set original values for change detection
      setOriginalTitle(res.data.app_title || 'Go Make Your Picks');
      setOriginalTagline(res.data.app_tagline || 'Predict. Compete. Win.');
      setOriginalFooterMessage(res.data.footer_message || 'Built for Sports Fans');
      setThemeMode(res.data.theme_mode || 'user_choice');
      setPointsFirstPlace(parseInt(res.data.points_first_place) || 6);
      setPointsSecondPlace(parseInt(res.data.points_second_place) || 5);
      setPointsThirdPlace(parseInt(res.data.points_third_place) || 4);
      setPointsFourthPlace(parseInt(res.data.points_fourth_place) || 3);
      setPointsFifthPlace(parseInt(res.data.points_fifth_place) || 2);
      setPointsSixthPlusPlace(parseInt(res.data.points_sixth_plus_place) || 1);
      setPointsNoPick(parseInt(res.data.points_no_pick) || 0);
      
      setOriginalTitle(res.data.app_title || 'Go Make Your Picks');
      setOriginalTagline(res.data.app_tagline || 'Predict. Compete. Win.');
      setOriginalFooterMessage(res.data.footer_message || 'Built for Sports Fans');
      setOriginalThemeMode(res.data.theme_mode || 'user_choice');
      setOriginalPointsFirstPlace(parseInt(res.data.points_first_place) || 6);
      setOriginalPointsSecondPlace(parseInt(res.data.points_second_place) || 5);
      setOriginalPointsThirdPlace(parseInt(res.data.points_third_place) || 4);
      setOriginalPointsFourthPlace(parseInt(res.data.points_fourth_place) || 3);
      setOriginalPointsFifthPlace(parseInt(res.data.points_fifth_place) || 2);
      setOriginalPointsSixthPlusPlace(parseInt(res.data.points_sixth_plus_place) || 1);
      setOriginalPointsNoPick(parseInt(res.data.points_no_pick) || 0);
      
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
      { name: 'First place', value: pointsFirstPlace, min: 0 },
      { name: 'Second place', value: pointsSecondPlace, min: 0 },
      { name: 'Third place', value: pointsThirdPlace, min: 0 },
      { name: 'Fourth place', value: pointsFourthPlace, min: 0 },
      { name: 'Fifth place', value: pointsFifthPlace, min: 0 },
      { name: 'Sixth place and below', value: pointsSixthPlusPlace, min: 0 },
      { name: 'No pick', value: pointsNoPick, min: -10 }
    ];

    for (const point of pointValues) {
      if (point.value < point.min || point.value > 20) {
        setError(`${point.name} points must be between ${point.min} and 20`);
        return;
      }
    }

    setLoading(true);

    try {
      await api.put('/admin/settings', {
        appTitle,
        appTagline,
        footerMessage,
        themeMode,
        pointsFirstPlace,
        pointsSecondPlace,
        pointsThirdPlace,
        pointsFourthPlace,
        pointsFifthPlace,
        pointsSixthPlusPlace,
        pointsNoPick
      });
      
      setSuccess('Settings updated successfully! Leaderboard scores will update automatically. Refresh the page to see the new scores.');
      setOriginalTitle(appTitle);
      setOriginalTagline(appTagline);
      setOriginalFooterMessage(footerMessage);
      setOriginalThemeMode(themeMode);
      setOriginalPointsFirstPlace(pointsFirstPlace);
      setOriginalPointsSecondPlace(pointsSecondPlace);
      setOriginalPointsThirdPlace(pointsThirdPlace);
      setOriginalPointsFourthPlace(pointsFourthPlace);
      setOriginalPointsFifthPlace(pointsFifthPlace);
      setOriginalPointsSixthPlusPlace(pointsSixthPlusPlace);
      setOriginalPointsNoPick(pointsNoPick);
      
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
    setThemeMode(originalThemeMode);
    setPointsFirstPlace(originalPointsFirstPlace);
    setPointsSecondPlace(originalPointsSecondPlace);
    setPointsThirdPlace(originalPointsThirdPlace);
    setPointsFourthPlace(originalPointsFourthPlace);
    setPointsFifthPlace(originalPointsFifthPlace);
    setPointsSixthPlusPlace(originalPointsSixthPlusPlace);
    setPointsNoPick(originalPointsNoPick);
    setError('');
    setSuccess('');
  };

  const hasChanges = 
    appTitle !== originalTitle ||
    appTagline !== originalTagline ||
    footerMessage !== originalFooterMessage ||
    themeMode !== originalThemeMode ||
    pointsFirstPlace !== originalPointsFirstPlace ||
    pointsSecondPlace !== originalPointsSecondPlace ||
    pointsThirdPlace !== originalPointsThirdPlace ||
    pointsFourthPlace !== originalPointsFourthPlace ||
    pointsFifthPlace !== originalPointsFifthPlace ||
    pointsSixthPlusPlace !== originalPointsSixthPlusPlace ||
    pointsNoPick !== originalPointsNoPick;

  if (loadingSettings) {
    return (
      <div className={loadingCenterClasses}>
        <p className={loadingTextClasses}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className={mb6Classes}>
        <h2 className={`${headingClasses} ${mb2Classes}`}>App Customization</h2>
      </div>

      <div className={`${cardClasses} ${shadowClasses}`}>
        {/* Info Box */}
        <div className={`${alertInfoClasses} ${p4Classes} ${mb6Classes}`}>
          <div className={flexItemsStartClasses}>
            <svg className={svgIconBlueClasses} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className={textSmallClasses}>
              <p className={`${alertInfoTextClasses} font-medium ${mb1Classes}`}>Customize Your App</p>
              <p className={alertInfoTextClasses}>
                These settings control the branding throughout the app, including the website header, footer, and email templates. 
                Changes take effect immediately but require a page refresh.
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className={`${alertSuccessClasses} ${p4Classes} ${mb6Classes}`}>
            <div className={flexItemsStartClasses}>
              <svg className={svgIconGreenClasses} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className={`${alertSuccessTextClasses} ${textSmallClasses}`}>{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`${alertErrorClasses} ${p4Classes} ${mb6Classes}`}>
            <div className={flexItemsStartClasses}>
              <svg className={svgIconRedClasses} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className={`${alertErrorTextClasses} ${textSmallClasses}`}>{error}</p>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className={previewBoxGradientClasses}>
          <h3 className={previewHeaderClasses}>Preview</h3>
          <div className={flexItemsGapClasses}>
            <span className={iconMediumClasses}>🏆</span>
            <div>
              <h1 className={previewTitleClasses}>{appTitle || 'Go Make Your Picks'}</h1>
              <p className={previewTextClasses}>{appTagline || 'Predict. Compete. Win.'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={formSectionLargeClasses}>
          {/* Basic Settings - 2 column grid */}
          <div className={gridTwoColLgClasses}>
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
              <p className={`${bodyTextClasses} ${mt1Classes} ${textXsClasses}`}>
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


          </div>

          <hr className={dividerClasses} />

          {/* Theme Mode Section */}
          <div className={pt6Classes}>
            <h3 className={`${subheadingClasses} ${mb4Classes}`}>Theme Mode</h3>
            <p className={`${bodyTextClasses} ${mb4Classes}`}>
              Control how users experience dark and light themes throughout the app.
            </p>

            <div className="space-y-4">
              <label className="flex items-start">
                <input
                  type="radio"
                  name="themeMode"
                  value="dark_only"
                  checked={themeMode === 'dark_only'}
                  onChange={(e) => setThemeMode(e.target.value as 'dark_only' | 'light_only' | 'user_choice')}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <span className={`${labelClasses} block`}>Dark Mode Only</span>
                  <p className={`${helpTextClasses} ${mt1Classes}`}>
                    Force dark theme for all users. The theme toggle button will be hidden.
                  </p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="radio"
                  name="themeMode"
                  value="light_only"
                  checked={themeMode === 'light_only'}
                  onChange={(e) => setThemeMode(e.target.value as 'dark_only' | 'light_only' | 'user_choice')}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <span className={`${labelClasses} block`}>Light Mode Only</span>
                  <p className={`${helpTextClasses} ${mt1Classes}`}>
                    Force light theme for all users. The theme toggle button will be hidden.
                  </p>
                </div>
              </label>

              <label className="flex items-start">
                <input
                  type="radio"
                  name="themeMode"
                  value="user_choice"
                  checked={themeMode === 'user_choice'}
                  onChange={(e) => setThemeMode(e.target.value as 'dark_only' | 'light_only' | 'user_choice')}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <span className={`${labelClasses} block`}>Dark/Light Mode (User Choice) 🌟 Default</span>
                  <p className={`${helpTextClasses} ${mt1Classes}`}>
                    Show theme toggle button. Users can switch between dark and light themes. Defaults to dark.
                  </p>
                </div>
              </label>
            </div>
          </div>

            <hr className={dividerClasses} />

            {/* Scoring Settings Section */}
            <div className={pt6Classes}>
              <h3 className={`${subheadingClasses} ${mb4Classes}`}>Scoring Settings</h3>
              <p className={`${bodyTextClasses} ${mb4Classes}`}>
                Customize point values for each placement. Changes apply to all rounds instantly.
              </p>

              <div className={gridThreeColMdClasses}>
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

                <div>
                  <label htmlFor="pointsNoPick" className={labelClasses}>
                    No Pick Points
                  </label>
                  <input
                    type="number"
                    id="pointsNoPick"
                    value={pointsNoPick}
                    onChange={(e) => setPointsNoPick(parseInt(e.target.value) || 0)}
                    min="-10"
                    max="20"
                    className={inputClasses}
                    required
                  />
                  <p className={`mt-1 ${helpTextClasses}`}>
                    Points for players who didn't make a pick (-10 to 20)
                  </p>
                  <p className={`mt-1 ${helpTextClasses} text-yellow-600 dark:text-yellow-400`}>
                    💡 Use negative values to penalize non-participation (e.g., -2 for penalty)
                  </p>
                </div>
              </div>

              <div className={warningBoxYellowClasses}>
                <div className={flexItemsStartClasses}>
                  <svg className={svgIconYellowClasses} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className={textSmallClasses}>
                    <p className={`${warningTextYellowClasses} ${textMediumClasses}`}>Dynamic Scoring</p>
                    <p className={`${warningTextYellowSecondaryClasses} ${mt1Classes}`}>
                      Changing these values will <strong>retroactively recalculate scores for all active seasons</strong>. 
                      Ended seasons preserve their original point values and are not affected.
                    </p>
                    <p className={`${warningTextYellowSecondaryClasses} ${mt1Classes}`}>
                      Maximum points per round: {pointsFirstPlace} (1st) + {pointsSecondPlace} (2nd) + ... = up to {pointsFirstPlace} points for the winner.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          <div className={flexSpaceXPtClasses}>
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className={`${flex1Classes} ${buttonPrimaryClasses} ${disabledOpacityClasses}`}
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
