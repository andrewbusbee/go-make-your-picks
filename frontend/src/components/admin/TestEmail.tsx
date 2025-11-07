import { useState, useEffect } from 'react';
import api from '../../utils/api';
import logger from '../../utils/logger';
import TimezoneSelector from '../TimezoneSelector';
import {
  headingClasses,
  labelClasses,
  helpTextClasses,
  buttonPrimaryClasses,
  cardClasses,
  alertInfoClasses,
  alertInfoTextClasses,
  alertSuccessClasses,
  alertSuccessTextClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  codeClasses,
  dividerClasses,
  loadingTextClasses,
  bodyTextClasses,
  inputClasses,
  radioGroupClasses,
  radioLabelClasses,
  radioInputClasses,
  radioTextClasses,
  buttonCancelClasses,
  flex1Classes,
  disabledOpacityClasses,
  flexSpaceXPtClasses,
  subheadingClasses,
  mb4Classes,
  mt1Classes,
  pt6Classes,
  gridTwoColLgClasses,
  gridTwoColMdClasses,
  timeInputClasses
} from '../../styles/commonClasses';

interface TestEmailProps {
  isMainAdmin: boolean;
}

export default function TestEmail({ isMainAdmin }: TestEmailProps) {
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingReminderSettings, setLoadingReminderSettings] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Reminder settings state
  const [reminderType, setReminderType] = useState<'daily' | 'before_lock' | 'none'>('daily');
  const [dailyReminderTime, setDailyReminderTime] = useState('10:00');
  const [reminderTimezone, setReminderTimezone] = useState('America/New_York');
  const [reminderFirstHours, setReminderFirstHours] = useState(48);
  const [reminderFinalHours, setReminderFinalHours] = useState(6);
  const [sendAdminSummary, setSendAdminSummary] = useState(true);
  const [originalReminderType, setOriginalReminderType] = useState<'daily' | 'before_lock' | 'none'>('daily');
  const [originalDailyReminderTime, setOriginalDailyReminderTime] = useState('10:00');
  const [originalReminderTimezone, setOriginalReminderTimezone] = useState('America/New_York');
  const [originalReminderFirstHours, setOriginalReminderFirstHours] = useState(48);
  const [originalReminderFinalHours, setOriginalReminderFinalHours] = useState(6);
  const [originalSendAdminSummary, setOriginalSendAdminSummary] = useState(true);
  const [reminderSuccess, setReminderSuccess] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  // Force send daily reminders state (main admin only)
  const [forceSending, setForceSending] = useState(false);
  const [forceSuccess, setForceSuccess] = useState('');
  const [forceError, setForceError] = useState('');

  // Load current user info and settings on component mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setCurrentUser({
          name: response.data.name,
          email: response.data.email
        });
      } catch (err) {
        logger.error('Failed to load current user:', err);
        setError('Failed to load user information. Please refresh the page.');
      } finally {
        setLoadingUser(false);
      }
    };

    const loadSettings = async () => {
      try {
        const response = await api.get('/public/settings');
        setEmailNotificationsEnabled(response.data.email_notifications_enabled === 'true');
      } catch (err) {
        logger.error('Failed to load settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    const loadReminderSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        
        // Load reminder settings only
        setReminderType(res.data.reminder_type || 'daily');
        const timeValue = res.data.daily_reminder_time || '10:00:00';
        setDailyReminderTime(timeValue.substring(0, 5));
        setReminderTimezone(res.data.reminder_timezone || 'America/New_York');
        setReminderFirstHours(parseInt(res.data.reminder_first_hours) || 48);
        setReminderFinalHours(parseInt(res.data.reminder_final_hours) || 6);
        setSendAdminSummary(res.data.send_admin_summary !== undefined ? res.data.send_admin_summary : true);
        
        setOriginalReminderType(res.data.reminder_type || 'daily');
        setOriginalDailyReminderTime(timeValue.substring(0, 5));
        setOriginalReminderTimezone(res.data.reminder_timezone || 'America/New_York');
        setOriginalReminderFirstHours(parseInt(res.data.reminder_first_hours) || 48);
        setOriginalReminderFinalHours(parseInt(res.data.reminder_final_hours) || 6);
        setOriginalSendAdminSummary(res.data.send_admin_summary !== undefined ? res.data.send_admin_summary : true);
      } catch (err) {
        logger.error('Failed to load reminder settings:', err);
      } finally {
        setLoadingReminderSettings(false);
      }
    };

    loadCurrentUser();
    loadSettings();
    loadReminderSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/admin/test-email', { email: currentUser?.email });
      setSuccess(`Test email sent successfully to ${response.data.sentTo}! Check your inbox.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send test email. Check your SMTP configuration.');
      if (err.response?.data?.details) {
        setError(`${err.response.data.error}: ${err.response.data.details}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmailNotifications = async () => {
    setError('');
    setSuccess('');
    
    try {
      const newValue = !emailNotificationsEnabled;
      await api.put('/admin/settings/email-notifications', { enabled: newValue });
      setEmailNotificationsEnabled(newValue);
      setSuccess(`Email notifications ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update email notifications setting');
    }
  };

  const handleSaveReminderSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setReminderError('');
    setReminderSuccess('');

    // Validate reminder settings based on type
    if (reminderType === 'daily') {
      if (!dailyReminderTime || !dailyReminderTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        setReminderError('Daily reminder time must be in HH:MM format');
        return;
      }
    } else if (reminderType === 'before_lock') {
      if (reminderFirstHours < 2 || reminderFirstHours > 168) {
        setReminderError('First reminder hours must be between 2 and 168');
        return;
      }
      if (reminderFinalHours < 1 || reminderFinalHours > 45) {
        setReminderError('Final reminder hours must be between 1 and 45');
        return;
      }
      if (reminderFirstHours <= reminderFinalHours) {
        setReminderError('First reminder must be more hours before lock time than final reminder');
        return;
      }
    }

    setSavingReminder(true);

    try {
      await api.put('/admin/settings/reminders', {
        reminderType,
        dailyReminderTime: reminderType === 'daily' ? dailyReminderTime + ':00' : undefined,
        reminderTimezone: reminderType === 'daily' ? reminderTimezone : undefined,
        reminderFirstHours: reminderType === 'before_lock' ? reminderFirstHours : undefined,
        reminderFinalHours: reminderType === 'before_lock' ? reminderFinalHours : undefined,
        sendAdminSummary
      });
      
      setReminderSuccess('Reminder settings updated successfully!');
      setOriginalReminderType(reminderType);
      setOriginalDailyReminderTime(dailyReminderTime);
      setOriginalReminderTimezone(reminderTimezone);
      setOriginalReminderFirstHours(reminderFirstHours);
      setOriginalReminderFinalHours(reminderFinalHours);
      setOriginalSendAdminSummary(sendAdminSummary);
    } catch (err: any) {
      setReminderError(err.response?.data?.error || 'Failed to update reminder settings');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleResetReminderSettings = () => {
    setReminderType(originalReminderType);
    setDailyReminderTime(originalDailyReminderTime);
    setReminderTimezone(originalReminderTimezone);
    setReminderFirstHours(originalReminderFirstHours);
    setReminderFinalHours(originalReminderFinalHours);
    setSendAdminSummary(originalSendAdminSummary);
    setReminderError('');
    setReminderSuccess('');
  };

  const hasReminderChanges = 
    reminderType !== originalReminderType ||
    dailyReminderTime !== originalDailyReminderTime ||
    reminderTimezone !== originalReminderTimezone ||
    reminderFirstHours !== originalReminderFirstHours ||
    reminderFinalHours !== originalReminderFinalHours ||
    sendAdminSummary !== originalSendAdminSummary;

  const handleForceSendDailyReminders = async () => {
    setForceSending(true);
    setForceError('');
    setForceSuccess('');

    try {
      const response = await api.post('/admin/rounds/force-send-daily-reminders');
      setForceSuccess(response.data.message);
      setTimeout(() => setForceSuccess(''), 8000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to force send daily reminders';
      setForceError(errorMsg);
      setTimeout(() => setForceError(''), 8000);
    } finally {
      setForceSending(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className={headingClasses + " mb-2"}>Email Configuration</h2>
      </div>

      {/* Email Notifications Toggle (Main Admin Only) */}
      {isMainAdmin && (
        <div className={cardClasses + " mb-6"}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={labelClasses + " font-semibold mb-1"}>User Notification Emails</h3>
              <p className={helpTextClasses}>
                {emailNotificationsEnabled 
                  ? 'Notification emails will be sent to users when rounds are activated or completed.' 
                  : 'User notifications disabled. Pick reminders and completion emails will not be sent. Admin login and password reset emails will still work.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleEmailNotifications}
              disabled={loadingSettings}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailNotificationsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={emailNotificationsEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  emailNotificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Reminder Email Settings */}
      <div className={cardClasses + " mb-6"}>
        <h3 className={`${subheadingClasses} ${mb4Classes}`}>Reminder Email Settings</h3>
        <p className={`${bodyTextClasses} ${mt1Classes} ${mb4Classes}`}>
          These settings control how and when reminder emails are sent to users who have not made their picks.
          Only one reminder type can be active at a time.
        </p>

        {loadingReminderSettings ? (
          <div className={loadingTextClasses}>Loading reminder settings...</div>
        ) : (
          <form onSubmit={handleSaveReminderSettings}>
            {/* Success Message */}
            {reminderSuccess && (
              <div className={`${alertSuccessClasses} ${mb4Classes}`}>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className={alertSuccessTextClasses}>{reminderSuccess}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {reminderError && (
              <div className={`${alertErrorClasses} ${mb4Classes}`}>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className={alertErrorTextClasses}>{reminderError}</p>
                </div>
              </div>
            )}

            {/* Reminder Type Selection */}
            <div className={mb4Classes}>
              <label className={labelClasses}>Reminder Type</label>
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

            {/* Admin Summary Email Checkbox - hidden when reminders disabled */}
            {reminderType !== 'none' && (
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
            )}

            {/* Save/Reset Buttons */}
            <div className={flexSpaceXPtClasses}>
              <button
                type="submit"
                disabled={savingReminder || !hasReminderChanges}
                className={`${flex1Classes} ${buttonPrimaryClasses} ${disabledOpacityClasses}`}
              >
                {savingReminder ? 'Saving...' : 'Save Reminder Settings'}
              </button>
              {hasReminderChanges && (
                <button
                  type="button"
                  onClick={handleResetReminderSettings}
                  className={buttonCancelClasses}
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className={cardClasses}>
        <h3 className={`${subheadingClasses} ${mb4Classes}`}>Send Test Email</h3>
        
        {/* Info Box */}
        <div className={alertInfoClasses + " mb-6"}>
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className={alertInfoTextClasses + " font-medium mb-1"}>What gets sent:</p>
              <p className={alertInfoTextClasses}>
                The test email uses the same template as magic links, so you can see exactly what your users will receive.
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className={alertSuccessClasses + " mb-6"}>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className={alertSuccessTextClasses}>{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={alertErrorClasses + " mb-6"}>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className={alertErrorTextClasses + " font-medium mb-1"}>Email failed to send</p>
                <p className={alertErrorTextClasses + " text-xs"}>{error}</p>
                <p className={alertErrorTextClasses + " text-xs mt-2"}>
                  Check your <code className={codeClasses}>docker-compose.override.yml</code> SMTP settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClasses}>
              Send Test Email To
            </label>
            {loadingUser ? (
              <div className={loadingTextClasses}>
                Loading user information...
              </div>
            ) : currentUser ? (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {currentUser.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={loadingTextClasses}>
                Unable to load user information
              </div>
            )}
            <p className={helpTextClasses + " mt-1"}>
              The test email will be sent to your registered email address.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || loadingUser || !currentUser}
            className={"w-full py-3 flex items-center justify-center " + buttonPrimaryClasses}
            data-testid="send-test-email-button"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Test Email...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Test Email
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className={"mt-6 pt-6 " + dividerClasses}>
          <h3 className={`${labelClasses} font-semibold`}>Troubleshooting Tips:</h3>
          <ul className={`${helpTextClasses} space-y-1`}>
            <li>✓ Make sure SMTP credentials are set in <code className={codeClasses}>docker-compose.override.yml</code></li>
            <li>✓ For Gmail, use an App Password (not your regular password)</li>
            <li>✓ Restart the app after changing SMTP settings: <code className={codeClasses}>docker-compose restart app</code></li>
            <li>✓ Check spam/junk folder if you don't receive the email</li>
            <li>✓ Check logs for errors: <code className={codeClasses}>docker-compose logs app</code></li>
          </ul>
        </div>
      </div>

      {/* Force Send Daily Reminders (Main Admin Only) */}
      {isMainAdmin && reminderType === 'daily' && (
        <div className={cardClasses}>
          <h3 className={`${subheadingClasses} ${mb4Classes}`}>Testing: Force Send Daily Reminders</h3>
          
          {/* Info Box */}
          <div className={`${alertInfoClasses} ${mb4Classes}`}>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className={`${alertInfoTextClasses} font-medium mb-1`}>Testing Override:</p>
                <p className={alertInfoTextClasses}>
                  This will immediately send daily reminders to all active rounds, bypassing the "already sent today" check. 
                  Use this for testing purposes only. Users will receive real reminder emails.
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {forceSuccess && (
            <div className={`${alertSuccessClasses} ${mb4Classes}`}>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className={alertSuccessTextClasses}>{forceSuccess}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {forceError && (
            <div className={`${alertErrorClasses} ${mb4Classes}`}>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className={alertErrorTextClasses}>{forceError}</p>
              </div>
            </div>
          )}

          {/* Force Send Button */}
          <button
            type="button"
            onClick={handleForceSendDailyReminders}
            disabled={forceSending}
            className={`w-full py-3 flex items-center justify-center ${buttonPrimaryClasses} ${disabledOpacityClasses} bg-orange-600 hover:bg-orange-700 focus:ring-orange-500`}
          >
            {forceSending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Reminders...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Force Send Daily Reminders Now
              </>
            )}
          </button>

          <p className={`mt-3 ${helpTextClasses}`}>
            <strong>Warning:</strong> This is for testing only. It will send actual emails to all users who haven't picked for active rounds.
          </p>
        </div>
      )}
    </div>
  );
}
