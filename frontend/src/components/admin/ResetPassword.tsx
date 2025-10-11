import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import PasswordInput from '../PasswordInput';
import { validatePasswordStrict, validatePasswordConfirmation } from '../../utils/passwordValidation';
import {
  pageContainerClasses,
  headingClasses,
  bodyTextClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  buttonLinkClasses,
  cardClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertSuccessClasses,
  alertSuccessTextClasses,
  helpTextClasses
} from '../../styles/commonClasses';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
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
      await api.post('/auth/reset-password', {
        token,
        password: newPassword
      });
      setMessage('Password reset successfully! You can now log in with your new password.');
      setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${pageContainerClasses} flex flex-col justify-center py-12 sm:px-6 lg:px-8`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🔑</span>
          <h2 className={`${headingClasses} text-3xl mb-2`}>Reset Password</h2>
          <p className={bodyTextClasses}>Enter your new password below.</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`${cardClasses} shadow sm:rounded-lg`}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="newPassword" className={labelClasses}>
                New Password
              </label>
              <div className="mt-1">
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={newPassword}
                  onChange={setNewPassword}
                  className={inputClasses}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <p className={`${helpTextClasses} mt-1`}>
                Minimum 6 characters. Cannot be "password".
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClasses}>
                Confirm New Password
              </label>
              <div className="mt-1">
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  className={inputClasses}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className={alertErrorClasses}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertErrorTextClasses}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className={alertSuccessClasses}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400 dark:text-green-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertSuccessTextClasses}>{message}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !token}
                className={`${buttonPrimaryClasses} w-full flex justify-center`}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>

            <div className="text-center">
              <a
                href="/admin/login"
                className={buttonLinkClasses}
              >
                ← Back to Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
