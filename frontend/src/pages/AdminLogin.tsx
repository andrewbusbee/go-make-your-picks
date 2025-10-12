import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import PasswordInput from '../components/PasswordInput';
import { usePageMeta } from '../utils/usePageMeta';
import {
  labelClasses,
  inputClasses,
  cardClasses,
  headingClasses,
  bodyTextClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertSuccessClasses,
  alertSuccessTextClasses,
  dividerClasses,
  buttonGradientPrimaryClasses,
  buttonGradientSecondaryClasses,
  buttonGradientPrimaryFlexClasses,
  loginFormClasses,
  loginButtonContainerClasses,
  loginBackLinkClasses,
  loginIconRedClasses,
  loginIconGreenClasses,
  loginLoadingSpinnerClasses
} from '../styles/commonClasses';

export default function AdminLogin() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'email' | 'password' | 'magic-link-sent' | 'verifying'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');
  const [appTagline, setAppTagline] = useState('Predict. Compete. Win.');
  const navigate = useNavigate();

  // Update page meta tags dynamically
  usePageMeta({
    title: `Admin Login - ${appTitle}`,
    description: appTagline
  });

  useEffect(() => {
    loadSettings();
    
    // Check if there's a token in the URL (magic link)
    const token = searchParams.get('token');
    if (token) {
      verifyMagicLink(token);
    }
  }, [searchParams]);

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
      setAppTagline(res.data.app_tagline || 'Predict. Compete. Win.');
    } catch (error) {
      console.error('Error loading settings:', error);
      // Don't throw - just use default values
    }
  };

  // Step 1: Check email and determine auth method
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/request-login', { email });

      if (response.data.requiresPassword) {
        // Main admin - show password field
        setStep('password');
      } else {
        // Secondary admin - send magic link automatically
        await sendMagicLink();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2a: Send magic link for secondary admin
  const sendMagicLink = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/send-magic-link', { email });
      // Don't show the magic-link-sent step - just show success message and stay on email step
      setSuccess(response.data.message || 'If an admin account with that email exists, a login link will be sent');
      setStep('email'); // Stay on email step instead of going to magic-link-sent
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many login requests. Please wait a few minutes and try again.');
      } else {
        setError(err.response?.data?.error || 'Failed to send login link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: Login with password for main admin
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { token, admin } = response.data;

      // Store token and admin data
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminData', JSON.stringify(admin));

      // Navigate to admin dashboard
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify magic link token
  const verifyMagicLink = async (token: string) => {
    setStep('verifying');
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-magic-link', { token });
      const { token: jwtToken, admin } = response.data;

      // Store token and admin data
      localStorage.setItem('adminToken', jwtToken);
      localStorage.setItem('adminData', JSON.stringify(admin));

      // Navigate to admin dashboard
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired login link. Please request a new one.');
      setStep('email');
      // Clear the token from URL
      window.history.replaceState({}, '', '/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  // Render different UI based on current step
  const renderContent = () => {
    switch (step) {
      case 'email':
        return (
          <form className={loginFormClasses} onSubmit={handleEmailSubmit}>
            <div>
              <label htmlFor="email" className={`${labelClasses} font-semibold`}>
                Email Address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClasses} py-3`}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {error && (
              <div className={alertErrorClasses}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={loginIconRedClasses} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertErrorTextClasses}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className={alertSuccessClasses}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={loginIconGreenClasses} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertSuccessTextClasses}>{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={buttonGradientPrimaryClasses}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className={loginLoadingSpinnerClasses} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
        );

      case 'password':
        return (
          <form className={loginFormClasses} onSubmit={handlePasswordSubmit}>
            <div>
              <label className={`${labelClasses} font-semibold`}>
                Email Address
              </label>
              <div className="mt-2">
                <div className={`${inputClasses} py-3 bg-gray-100 dark:bg-gray-700`}>
                  {email}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`${labelClasses} font-semibold`}>
                Password
              </label>
              <div className="mt-2">
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  className={`${inputClasses} py-3`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className={alertErrorClasses}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={loginIconRedClasses} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertErrorTextClasses}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className={loginButtonContainerClasses}>
              <button
                type="button"
                onClick={handleBackToEmail}
                className={buttonGradientSecondaryClasses}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className={buttonGradientPrimaryFlexClasses}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className={loginLoadingSpinnerClasses} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/admin/forgot-password"
                className={loginBackLinkClasses}
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        );

      case 'magic-link-sent':
        return (
          <div className={loginFormClasses}>
            {success && (
              <div className={alertSuccessClasses}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={loginIconGreenClasses} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertSuccessTextClasses}>{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center py-6">
              <span className="text-6xl mb-4 block">📧</span>
              <h3 className={`${headingClasses} text-xl mb-2`}>Check Your Email</h3>
              <p className={`${bodyTextClasses} text-sm`}>
                The link will expire in 10 minutes.
              </p>
            </div>

            {error && (
              <div className={alertErrorClasses}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={loginIconRedClasses} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertErrorTextClasses}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={sendMagicLink}
                disabled={loading}
                className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending...' : 'Resend Login Link'}
              </button>
              <button
                type="button"
                onClick={handleBackToEmail}
                className="w-full py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition"
              >
                ← Use a different email
              </button>
            </div>
          </div>
        );

      case 'verifying':
        return (
          <div className="text-center py-12">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className={`${headingClasses} text-xl mb-2`}>Verifying...</h3>
            <p className={bodyTextClasses}>Please wait while we log you in</p>

            {error && (
              <div className={`${alertErrorClasses} mt-6`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={loginIconRedClasses} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={alertErrorTextClasses}>{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🏆</span>
          <h2 className={`${headingClasses} text-3xl mb-2`}>Admin Login</h2>
          <p className={bodyTextClasses}>Sign in to manage the competition</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`${cardClasses} shadow-xl sm:rounded-2xl`}>
          {renderContent()}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full ${dividerClasses}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${cardClasses} ${bodyTextClasses} rounded-none`}>Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/"
                className={`text-sm ${bodyTextClasses} hover:text-gray-900 dark:hover:text-gray-200 transition`}
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
