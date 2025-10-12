import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import { usePageMeta } from '../utils/usePageMeta';
import Footer from '../components/Footer';
import {
  pageContainerClasses,
  bodyTextClasses,
  modalBackdropClasses,
  modalClasses,
  labelClasses,
  mainTabActiveClasses,
  mainTabInactiveClasses
} from '../styles/commonClasses';
import UsersManagement from '../components/admin/UsersManagement';
import RoundsManagement from '../components/admin/RoundsManagement';
import SeasonsManagement from '../components/admin/SeasonsManagement';
import SeasonDetail from '../components/admin/SeasonDetail';
import AdminPicksManagement from '../components/admin/AdminPicksManagement';
import ChangePassword from '../components/admin/ChangePassword';
import ChangeEmail from '../components/admin/ChangeEmail';
import InitialSetup from '../components/admin/InitialSetup';
import GettingStarted from '../components/admin/GettingStarted';
import Settings from '../components/admin/Settings';

export default function AdminDashboard() {
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');
  const [appTagline, setAppTagline] = useState('Predict. Compete. Win.');
  const [hasPlayers, setHasPlayers] = useState(false);
  const [hasSeasons, setHasSeasons] = useState(false);
  const [hasSports, setHasSports] = useState(false);
  const [enableDevTools, setEnableDevTools] = useState(false);
  const [customizationState, setCustomizationState] = useState({
    branding: false,
    scoring: false,
    reminders: false
  });
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Update page meta tags dynamically
  usePageMeta({
    title: `Admin Dashboard - ${appTitle}`,
    description: appTagline
  });

  const isActive = (path: string) => {
    // Getting Started tab - check if it's the default when system is empty
    if (path === '/admin/getting-started') {
      const isGettingStartedPath = location.pathname === '/admin/getting-started';
      const isDefaultWithNoData = (location.pathname === '/admin' || location.pathname === '/admin/') && 
                                    (!hasPlayers || !hasSeasons || !hasSports);
      return isGettingStartedPath || isDefaultWithNoData;
    }
    // Players tab
    if (path === '/admin/users') {
      const isUsersPath = location.pathname === '/admin/users';
      const isDefaultWithData = (location.pathname === '/admin' || location.pathname === '/admin/') && 
                                  hasPlayers && hasSeasons && hasSports;
      return isUsersPath || isDefaultWithData;
    }
    // Rounds tab
    if (path === '/admin/rounds') {
      return location.pathname === '/admin/rounds';
    }
    return location.pathname.startsWith(path);
  };

  const getTabClass = (path: string) => {
    return isActive(path) ? mainTabActiveClasses : mainTabInactiveClasses;
  };

  useEffect(() => {
    checkAuth();
    loadSettings();
    checkSystemStatus();
    loadConfig();
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Refresh system status when location changes (for tab highlighting)
  useEffect(() => {
    checkSystemStatus();
    // Also reload settings to update customization state when navigating
    loadSettings();
  }, [location.pathname]);

  const checkSystemStatus = async () => {
    try {
      const [playersRes, seasonsRes, sportsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/seasons'),
        api.get('/admin/rounds')
      ]);
      
      setHasPlayers(playersRes.data && playersRes.data.length > 0);
      setHasSeasons(seasonsRes.data && seasonsRes.data.length > 0);
      setHasSports(sportsRes.data && sportsRes.data.length > 0);
    } catch (error) {
      console.error('Error checking system status:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
      setAppTagline(res.data.app_tagline || 'Predict. Compete. Win.');
      
      // Check customization state
      const defaultTitle = 'Go Make Your Picks';
      const defaultTagline = 'Predict. Compete. Win.';
      const defaultFooter = 'Built for Sports Fans';
      const defaultTimezone = 'America/New_York';
      const defaultPoints = {
        first: 6,
        second: 5,
        third: 4,
        fourth: 3,
        fifth: 2,
        sixth: 1
      };
      const defaultReminderType = 'daily';
      const defaultReminderTime = '10:00:00';
      const defaultFirstHours = 48;
      const defaultFinalHours = 6;
      
      setCustomizationState({
        branding: (
          res.data.app_title !== defaultTitle ||
          res.data.app_tagline !== defaultTagline ||
          res.data.footer_message !== defaultFooter
        ),
        scoring: (
          parseInt(res.data.points_first_place) !== defaultPoints.first ||
          parseInt(res.data.points_second_place) !== defaultPoints.second ||
          parseInt(res.data.points_third_place) !== defaultPoints.third ||
          parseInt(res.data.points_fourth_place) !== defaultPoints.fourth ||
          parseInt(res.data.points_fifth_place) !== defaultPoints.fifth ||
          parseInt(res.data.points_sixth_plus_place) !== defaultPoints.sixth
        ),
        reminders: (
          res.data.reminder_type !== defaultReminderType ||
          res.data.daily_reminder_time !== defaultReminderTime ||
          parseInt(res.data.reminder_first_hours) !== defaultFirstHours ||
          parseInt(res.data.reminder_final_hours) !== defaultFinalHours
        )
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await api.get('/public/config');
      setEnableDevTools(res.data.enableDevTools || false);
    } catch (error) {
      console.error('Error loading config:', error);
      setEnableDevTools(false);
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('adminToken');
    const storedAdminData = localStorage.getItem('adminData');

    if (!token || !storedAdminData) {
      navigate('/admin/login');
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setAdminData(res.data);
      
      // Force password change if required
      if (res.data.must_change_password) {
        setShowChangePassword(true);
      }
      
      setLoading(false);
    } catch (error) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      navigate('/admin/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className={`${pageContainerClasses} flex items-center justify-center`}>
        <p className={bodyTextClasses}>Loading...</p>
      </div>
    );
  }

  if (showChangePassword && adminData?.must_change_password) {
    return (
      <InitialSetup
        onSuccess={(token, username) => {
          // Update the token
          localStorage.setItem('adminToken', token);
          localStorage.setItem('adminData', JSON.stringify({
            ...adminData,
            username,
            mustChangePassword: false
          }));
          setShowChangePassword(false);
          checkAuth();
        }}
      />
    );
  }

  return (
    <div className={`${pageContainerClasses} pb-20`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-900 dark:to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2 md:py-4">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-3xl">🏆</span>
                <span className="text-xl font-bold text-white">{appTitle}</span>
              </Link>
              <span className="text-sm text-blue-100 hidden md:inline">Admin Dashboard</span>
            </div>

            {/* User Menu & Theme Toggle */}
            <div className="flex items-center space-x-3">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-white hover:text-blue-100 focus:outline-none"
                >
                  <span className="text-sm font-medium">{adminData?.username}</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50">
                    <button
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowUserMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${labelClasses} hover:bg-gray-100 dark:hover:bg-gray-700`}
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setShowChangeEmail(true);
                        setShowUserMenu(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${labelClasses} hover:bg-gray-100 dark:hover:bg-gray-700`}
                    >
                      Change Email
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={toggleTheme}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 text-2xl"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex flex-wrap gap-2 overflow-x-auto">
            <Link
              to="/admin/users"
              className={getTabClass('/admin/users')}
            >
              Players
            </Link>
            <Link
              to="/admin/seasons"
              className={getTabClass('/admin/seasons')}
            >
              Seasons
            </Link>
            <Link
              to="/admin/rounds"
              className={getTabClass('/admin/rounds')}
            >
              Sports
            </Link>
            <Link
              to="/admin/manage-picks"
              className={getTabClass('/admin/manage-picks')}
            >
              Manage Picks
            </Link>
            <Link
              to="/admin/getting-started"
              className={getTabClass('/admin/getting-started')}
            >
              Getting Started
            </Link>
            <Link
              to="/admin/settings"
              className={getTabClass('/admin/settings')}
            >
              Settings
            </Link>
          </nav>
        </div>

        {/* Development Tools - Only shown when ENABLE_DEV_TOOLS=true */}
        {enableDevTools === true && adminData?.is_main_admin === 1 ? (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🌱</span>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">Development Tools</h3>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Sample data: 15 players + 1 season + 11 sports (2 active, 9 completed) + picks & scores
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                    To hide this section, set ENABLE_DEV_TOOLS: "false" in docker-compose and restart. Delete sample data first if you have seeded it.
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    if (!confirm('This will add sample data to your database. Continue?')) return;
                    try {
                      const res = await api.post('/admin/seed/seed-test-data');
                      alert(res.data.message || 'Sample data seeded successfully!');
                      window.location.reload();
                    } catch (error: any) {
                      alert(error.response?.data?.error || 'Failed to seed sample data');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  🌱 Seed Sample Data
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('This will delete all sample data. Continue?')) return;
                    try {
                      const res = await api.post('/admin/seed/clear-test-data');
                      alert(res.data.message || 'Sample data deleted successfully!');
                      window.location.reload();
                    } catch (error: any) {
                      alert(error.response?.data?.error || 'Failed to delete sample data');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                  🗑️ Delete Sample Data
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Routes */}
        <Routes>
          <Route path="/" element={
            !hasPlayers || !hasSeasons || !hasSports ? (
              <Navigate to="/admin/getting-started" replace />
            ) : (
              <Navigate to="/admin/users" replace />
            )
          } />
          <Route path="/getting-started" element={
            <GettingStarted 
              onNavigate={(path) => navigate(path)}
              hasPlayers={hasPlayers}
              hasSeasons={hasSeasons}
              hasSports={hasSports}
              customizationState={customizationState}
            />
          } />
          <Route path="/users" element={<UsersManagement />} />
          <Route path="/rounds" element={<RoundsManagement />} />
          <Route path="/seasons" element={<SeasonsManagement />} />
          <Route path="/seasons/:seasonId" element={<SeasonDetail />} />
          <Route path="/manage-picks" element={<AdminPicksManagement />} />
          <Route path="/settings" element={<Settings isMainAdmin={adminData?.is_main_admin || false} />} />
          <Route path="/settings/email" element={<Settings isMainAdmin={adminData?.is_main_admin || false} />} />
          <Route path="/settings/admins" element={<Settings isMainAdmin={adminData?.is_main_admin || false} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && !adminData?.must_change_password && (
        <div className={modalBackdropClasses}>
          <div className={`${modalClasses} max-w-md w-full`}>
            <ChangePassword 
              onSuccess={() => {
                setShowChangePassword(false);
                checkAuth();
              }}
              onCancel={() => setShowChangePassword(false)}
            />
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showChangeEmail && (
        <div className={modalBackdropClasses}>
          <div className={`${modalClasses} max-w-md w-full`}>
            <ChangeEmail 
              onSuccess={() => {
                setShowChangeEmail(false);
                checkAuth();
              }}
              onCancel={() => setShowChangeEmail(false)}
              currentEmail={adminData?.email}
            />
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}

