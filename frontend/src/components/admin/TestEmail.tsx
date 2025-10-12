import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  headingClasses,
  labelClasses,
  inputClasses,
  selectClasses,
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

interface Admin {
  id: number;
  username: string;
  email: string;
}

export default function TestEmail() {
  const [selectedAdminId, setSelectedAdminId] = useState<number | ''>('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load admins on component mount
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const response = await api.get('/admin/admins');
        setAdmins(response.data);
      } catch (err) {
        console.error('Failed to load admins:', err);
        setError('Failed to load admin list. Please refresh the page.');
      } finally {
        setLoadingAdmins(false);
      }
    };

    loadAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!selectedAdminId) {
      setError('Please select an admin to send the test email to.');
      setLoading(false);
      return;
    }

    try {
      const selectedAdmin = admins.find(admin => admin.id === selectedAdminId);
      const response = await api.post('/admin/test-email', { email: selectedAdmin?.email });
      setSuccess(`Test email sent successfully to ${response.data.sentTo}! Check your inbox.`);
      setSelectedAdminId(''); // Clear the selection
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send test email. Check your SMTP configuration.');
      if (err.response?.data?.details) {
        setError(`${err.response.data.error}: ${err.response.data.details}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className={headingClasses + " mb-2"}>Email Configuration</h2>
      </div>

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
            <label htmlFor="admin-select" className={labelClasses}>
              Send Test Email To
            </label>
            {loadingAdmins ? (
              <div className={loadingTextClasses}>
                Loading admin list...
              </div>
            ) : (
              <select
                id="admin-select"
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value ? Number(e.target.value) : '')}
                className={selectClasses}
                required
              >
                <option value="">Select an admin...</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.username} ({admin.email})
                  </option>
                ))}
              </select>
            )}
            <p className={helpTextClasses + " mt-1"}>
              Select an admin to send the test email to their registered email address.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || loadingAdmins || !selectedAdminId}
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
