import { useState } from 'react';
import api from '../../utils/api';
import PasswordInput from '../PasswordInput';
import { validatePasswordStrict, validatePasswordConfirmation } from '../../utils/passwordValidation';
import {
  bodyTextClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertInfoClasses,
  alertInfoTextClasses,
  helpTextClasses,
  cardClasses
} from '../../styles/commonClasses';

interface InitialSetupProps {
  onSuccess: (token: string, username: string) => void;
}

export default function InitialSetup({ onSuccess }: InitialSetupProps) {
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!newEmail) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (newUsername.toLowerCase() === 'user') {
      setError('Username "user" is not allowed. Please choose a different username.');
      return;
    }

    if (newUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      setError(confirmValidation.errors[0]);
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrict(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/initial-setup', {
        newUsername,
        newEmail,
        newPassword
      });
      
      // Update token and username
      localStorage.setItem('adminToken', response.data.token);
      onSuccess(response.data.token, response.data.username);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className={`${cardClasses} rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 p-8 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Welcome!</h1>
          <p className="text-center text-blue-100 text-lg">Let's secure your account</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className={alertInfoClasses + " p-4 mb-6"}>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className={alertInfoTextClasses + " font-medium mb-1"}>First-Time Setup Required</p>
                <p className={alertInfoTextClasses}>
                  For security, you must change your default username and password. 
                  Choose something memorable and secure.
                </p>
              </div>
            </div>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Username */}
            <div>
              <label className={labelClasses}>
                Choose Your Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter a unique username (not 'user')"
                className={inputClasses + " py-3"}
                required
                minLength={3}
              />
              <p className={bodyTextClasses + " mt-1 text-xs"}>
                ✓ At least 3 characters • Cannot be "user"
              </p>
            </div>

            {/* New Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Your Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter your email address"
                className={`${inputClasses} py-3`}
                required
              />
              <p className={`mt-1 ${helpTextClasses}`}>
                ✓ Used for password reset and notifications
              </p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Choose Your Password
              </label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter a strong password"
                className={`${inputClasses} py-3`}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className={`mt-1 ${helpTextClasses}`}>
                ✓ At least 8 characters • Lowercase + Uppercase + Number • Avoid common passwords
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter your password"
                className={`${inputClasses} py-3`}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${buttonPrimaryClasses} py-4 px-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting up...
                </span>
              ) : (
                'Complete Setup & Continue'
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className={helpTextClasses}>
              🔒 Your credentials are encrypted and stored securely
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
