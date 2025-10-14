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
  gridTwoColMdClasses,
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
  radioGroupClasses,
  radioLabelClasses,
  radioInputClasses,
  radioTextClasses,
  shadowClasses,
  flex1Classes,
  disabledOpacityClasses,
  p4Classes,
  timeInputClasses
} from '../../styles/commonClasses';

export default function AppSettings() {
  const [appTitle, setAppTitle] = useState('');
  const [appTagline, setAppTagline] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [pointsFirstPlace, setPointsFirstPlace] = useState(6);
  const [pointsSecondPlace, setPointsSecondPlace] = useState(5);
  const [pointsThirdPlace, setPointsThirdPlace] = useState(4);
  const [pointsFourthPlace, setPointsFourthPlace] = useState(3);
  const [pointsFifthPlace, setPointsFifthPlace] = useState(2);
  const [pointsSixthPlusPlace, setPointsSixthPlusPlace] = useState(1);
  const [reminderType, setReminderType] = useState<'daily' | 'before_lock' | 'none'>('daily');
  const [dailyReminderTime, setDailyReminderTime] = useState('10:00');
  const [reminderTimezone, setReminderTimezone] = useState('America/New_York');
  const [reminderFirstHours, setReminderFirstHours] = useState(48);
  const [reminderFinalHours, setReminderFinalHours] = useState(6);
  const [sendAdminSummary, setSendAdminSummary] = useState(true);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalTagline, setOriginalTagline] = useState('');
  const [originalFooterMessage, setOriginalFooterMessage] = useState('');
  const [originalPointsFirstPlace, setOriginalPointsFirstPlace] = useState(6);
  const [originalPointsSecondPlace, setOriginalPointsSecondPlace] = useState(5);
  const [originalPointsThirdPlace, setOriginalPointsThirdPlace] = useState(4);
  const [originalPointsFourthPlace, setOriginalPointsFourthPlace] = useState(3);
  const [originalPointsFifthPlace, setOriginalPointsFifthPlace] = useState(2);
  const [originalPointsSixthPlusPlace, setOriginalPointsSixthPlusPlace] = useState(1);
  const [originalReminderType, setOriginalReminderType] = useState<'daily' | 'before_lock' | 'none'>('daily');
  const [originalDailyReminderTime, setOriginalDailyReminderTime] = useState('10:00');
  const [originalReminderTimezone, setOriginalReminderTimezone] = useState('America/New_York');
  const [originalReminderFirstHours, setOriginalReminderFirstHours] = useState(48);
  const [originalReminderFinalHours, setOriginalReminderFinalHours] = useState(6);
  const [originalSendAdminSummary, setOriginalSendAdminSummary] = useState(true);
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
      setPointsFirstPlace(parseInt(res.data.points_first_place) || 6);
      setPointsSecondPlace(parseInt(res.data.points_second_place) || 5);
      setPointsThirdPlace(parseInt(res.data.points_third_place) || 4);
      setPointsFourthPlace(parseInt(res.data.points_fourth_place) || 3);
      setPointsFifthPlace(parseInt(res.data.points_fifth_place) || 2);
      setPointsSixthPlusPlace(parseInt(res.data.points_sixth_plus_place) || 1);
      setReminderType(res.data.reminder_type || 'daily');
      // Convert HH:MM:SS format to HH:MM format for the time input
      const timeValue = res.data.daily_reminder_time || '10:00:00';
      setDailyReminderTime(timeValue.substring(0, 5)); // Remove seconds part
      setReminderTimezone(res.data.reminder_timezone || 'America/New_York');
      setReminderFirstHours(parseInt(res.data.reminder_first_hours) || 48);
      setReminderFinalHours(parseInt(res.data.reminder_final_hours) || 6);
      setSendAdminSummary(res.data.send_admin_summary !== undefined ? res.data.send_admin_summary : true);
      
      setOriginalTitle(res.data.app_title || 'Go Make Your Picks');
      setOriginalTagline(res.data.app_tagline || 'Predict. Compete. Win.');
      setOriginalFooterMessage(res.data.footer_message || 'Built for Sports Fans');
      setOriginalPointsFirstPlace(parseInt(res.data.points_first_place) || 6);
      setOriginalPointsSecondPlace(parseInt(res.data.points_second_place) || 5);
      setOriginalPointsThirdPlace(parseInt(res.data.points_third_place) || 4);
      setOriginalPointsFourthPlace(parseInt(res.data.points_fourth_place) || 3);
      setOriginalPointsFifthPlace(parseInt(res.data.points_fifth_place) || 2);
      setOriginalPointsSixthPlusPlace(parseInt(res.data.points_sixth_plus_place) || 1);
      
      // Set original reminder values
      const originalTimeValue = res.data.daily_reminder_time || '10:00:00';
      setOriginalReminderType(res.data.reminder_type || 'daily');
      setOriginalDailyReminderTime(originalTimeValue.substring(0, 5)); // Remove seconds part
      setOriginalReminderTimezone(res.data.reminder_timezone || 'America/New_York');
      setOriginalReminderFirstHours(parseInt(res.data.reminder_first_hours) || 48);
      setOriginalReminderFinalHours(parseInt(res.data.reminder_final_hours) || 6);
      setOriginalSendAdminSummary(res.data.send_admin_summary !== undefined ? res.data.send_admin_summary : true);
      
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

    // Validate reminder settings based on type
    if (reminderType === 'daily') {
      // Validate daily reminder time format
      if (!dailyReminderTime || !dailyReminderTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        setError('Daily reminder time must be in HH:MM format');
        return;
      }
    } else if (reminderType === 'before_lock') {
      // Validate reminder hours
      if (reminderFirstHours < 2 || reminderFirstHours > 168) {
        setError('First reminder hours must be between 2 and 168');
        return;
      }

      if (reminderFinalHours < 1 || reminderFinalHours > 45) {
        setError('Final reminder hours must be between 1 and 45');
        return;
      }

      if (reminderFirstHours <= reminderFinalHours) {
        setError('First reminder must be more hours before lock time than final reminder');
        return;
      }
    }

    setLoading(true);

    try {
      await api.put('/admin/settings', {
        appTitle,
        appTagline,
        footerMessage,
        pointsFirstPlace,
        pointsSecondPlace,
        pointsThirdPlace,
        pointsFourthPlace,
        pointsFifthPlace,
        pointsSixthPlusPlace,
        reminderType,
        dailyReminderTime: reminderType === 'daily' ? dailyReminderTime + ':00' : undefined,
        reminderTimezone: reminderType === 'daily' ? reminderTimezone : undefined,
        reminderFirstHours: reminderType === 'before_lock' ? reminderFirstHours : undefined,
        reminderFinalHours: reminderType === 'before_lock' ? reminderFinalHours : undefined,
        sendAdminSummary
      });
      
      setSuccess('Settings updated successfully! Leaderboard scores will update automatically. Refresh the page to see the new scores.');
      setOriginalTitle(appTitle);
      setOriginalTagline(appTagline);
      setOriginalFooterMessage(footerMessage);
      setOriginalPointsFirstPlace(pointsFirstPlace);
      setOriginalPointsSecondPlace(pointsSecondPlace);
      setOriginalPointsThirdPlace(pointsThirdPlace);
      setOriginalPointsFourthPlace(pointsFourthPlace);
      setOriginalPointsFifthPlace(pointsFifthPlace);
      setOriginalPointsSixthPlusPlace(pointsSixthPlusPlace);
      setOriginalReminderType(reminderType);
      setOriginalDailyReminderTime(dailyReminderTime);
      setOriginalReminderTimezone(reminderTimezone);
      setOriginalReminderFirstHours(reminderFirstHours);
      setOriginalReminderFinalHours(reminderFinalHours);
      setOriginalSendAdminSummary(sendAdminSummary);
      
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
    setPointsFirstPlace(originalPointsFirstPlace);
    setPointsSecondPlace(originalPointsSecondPlace);
    setPointsThirdPlace(originalPointsThirdPlace);
    setPointsFourthPlace(originalPointsFourthPlace);
    setPointsFifthPlace(originalPointsFifthPlace);
    setPointsSixthPlusPlace(originalPointsSixthPlusPlace);
    setReminderType(originalReminderType);
    setDailyReminderTime(originalDailyReminderTime);
    setReminderTimezone(originalReminderTimezone);
    setReminderFirstHours(originalReminderFirstHours);
    setReminderFinalHours(originalReminderFinalHours);
    setSendAdminSummary(originalSendAdminSummary);
    setError('');
    setSuccess('');
  };

  const hasChanges = 
    appTitle !== originalTitle || 
    appTagline !== originalTagline ||
    footerMessage !== originalFooterMessage ||
    pointsFirstPlace !== originalPointsFirstPlace ||
    pointsSecondPlace !== originalPointsSecondPlace ||
    pointsThirdPlace !== originalPointsThirdPlace ||
    pointsFourthPlace !== originalPointsFourthPlace ||
    pointsFifthPlace !== originalPointsFifthPlace ||
    pointsSixthPlusPlace !== originalPointsSixthPlusPlace ||
    reminderType !== originalReminderType ||
    dailyReminderTime !== originalDailyReminderTime ||
    reminderTimezone !== originalReminderTimezone ||
    reminderFirstHours !== originalReminderFirstHours ||
    reminderFinalHours !== originalReminderFinalHours ||
    sendAdminSummary !== originalSendAdminSummary;

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

            {/* Reminder Settings */}
            <div className={pt6Classes}>
              <h3 className={subheadingClasses}>Reminder Email Settings</h3>
              <p className={`${bodyTextClasses} ${mt1Classes} ${mb4Classes}`}>
                These settings control how and when reminder emails are sent to users who have not made their picks.
                Only one reminder type can be active at a time.
              </p>
              
              {/* Reminder Type Selection */}
              <div className={mb4Classes}>
                <label className={labelClasses}>
                  Reminder Type
                </label>
                <div className={radioGroupClasses}>
                  <label className={radioLabelClasses}>
                    <input
                      type="radio"
                      name="reminderType"
                      value="daily"
                      checked={reminderType === 'daily'}
                      onChange={(e) => setReminderType(e.target.value as 'daily' | 'before_lock' | 'none')}
                      className={radioInputClasses}
                    />
                    <span className={radioTextClasses}>Send reminder every day</span>
                  </label>
                  <label className={radioLabelClasses}>
                    <input
                      type="radio"
                      name="reminderType"
                      value="before_lock"
                      checked={reminderType === 'before_lock'}
                      onChange={(e) => setReminderType(e.target.value as 'daily' | 'before_lock' | 'none')}
                      className={radioInputClasses}
                    />
                    <span className={radioTextClasses}>Send reminders before lock time</span>
                  </label>
                  <label className={radioLabelClasses}>
                    <input
                      type="radio"
                      name="reminderType"
                      value="none"
                      checked={reminderType === 'none'}
                      onChange={(e) => setReminderType(e.target.value as 'daily' | 'before_lock' | 'none')}
                      className={radioInputClasses}
                    />
                    <span className={radioTextClasses}>Do not send reminder emails</span>
                  </label>
                </div>
              </div>

              {/* Daily Reminder Settings */}
              {reminderType === 'daily' && (
                <div className={gridTwoColLgClasses}>
                  <div>
                    <label htmlFor="dailyReminderTime" className={labelClasses}>
                      Time of day to send
                    </label>
                    <input
                      type="time"
                      id="dailyReminderTime"
                      value={dailyReminderTime}
                      onChange={(e) => setDailyReminderTime(e.target.value)}
                      className={timeInputClasses}
                      required
                    />
                    <p className={`mt-1 ${helpTextClasses}`}>
                      Daily reminders will be sent at this time
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="reminderTimezone" className={labelClasses}>
                      Daily Reminder Timezone
                    </label>
                    <TimezoneSelector
                      value={reminderTimezone}
                      onChange={setReminderTimezone}
                      required
                    />
                    <p className={`mt-1 ${helpTextClasses}`}>
                      Daily reminders will use this timezone
                    </p>
                  </div>
                </div>
              )}

              {/* Before Lock Reminder Settings */}
              {reminderType === 'before_lock' && (
                <div>
                  <div className={gridTwoColMdClasses}>
                    <div>
                      <label htmlFor="reminderFirstHours" className={labelClasses}>
                        First Reminder (hours before lock time)
                      </label>
                      <input
                        type="number"
                        id="reminderFirstHours"
                        value={reminderFirstHours}
                        onChange={(e) => setReminderFirstHours(parseInt(e.target.value) || 0)}
                        min="2"
                        max="168"
                        className={inputClasses}
                        required
                      />
                      <p className={`mt-1 ${helpTextClasses}`}>
                        Default: 48 hours. Users receive first reminder this many hours before picks lock (2-168 hours)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="reminderFinalHours" className={labelClasses}>
                        Final Reminder (hours before lock time)
                      </label>
                      <input
                        type="number"
                        id="reminderFinalHours"
                        value={reminderFinalHours}
                        onChange={(e) => setReminderFinalHours(parseInt(e.target.value) || 0)}
                        min="1"
                        max="45"
                        className={inputClasses}
                        required
                      />
                      <p className={`mt-1 ${helpTextClasses}`}>
                        Default: 6 hours. Users receive final reminder this many hours before picks lock (1-45 hours)
                      </p>
                    </div>
                  </div>
                  <p className={`mt-3 ${helpTextClasses}`}>
                    <strong>Note:</strong> Before-lock reminders use each sport's individual timezone from the lock time settings.
                  </p>
                </div>
              )}

              {/* Admin Summary Email Checkbox */}
              <div className={`${mb4Classes} ${pt6Classes}`}>
                <label className={`${radioLabelClasses} cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={sendAdminSummary}
                    onChange={(e) => setSendAdminSummary(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className={radioTextClasses}>Send admin summary when reminders go out</span>
                </label>
                <p className={`mt-2 ml-6 ${helpTextClasses}`}>
                  When enabled, admins will receive a summary email showing who has picked and who hasn't when player 
                  reminders are sent. This does not affect player reminder emails.
                </p>
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
