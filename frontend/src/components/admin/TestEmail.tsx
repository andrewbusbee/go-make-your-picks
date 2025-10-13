import { useState, useEffect } from 'react';
import api from '../../utils/api';
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
  loadingTextClasses
} from '../../styles/commonClasses';

interface TestEmailProps {
  isMainAdmin: boolean;
}

export default function TestEmail({ isMainAdmin }: TestEmailProps) {
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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
        console.error('Failed to load current user:', err);
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
        console.error('Failed to load settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadCurrentUser();
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/admin/test-email');
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

      <div className={cardClasses}>
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
    </div>
  );
}
