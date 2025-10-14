import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import { 
  themeToggleButtonClasses, 
  championsButtonClasses,
  mobileHamburgerButtonClasses,
  mobileHamburgerIconClasses,
  mobileDropdownMenuClasses,
  mobileDropdownMenuItemClasses,
  mobileDropdownMenuItemWithIconClasses,
  mobileDropdownMenuItemIconClasses,
  mobileDropdownMenuItemTextClasses,
  mobileDropdownMenuItemSpecialClasses,
  mobileDropdownMenuItemAdminClasses,
  mobileDropdownMenuItemThemeClasses,
  mobileHeaderContainerClasses,
  mobileLogoContainerClasses,
  mobileNavigationDesktopClasses,
  mobileNavigationMobileClasses
} from '../styles/commonClasses';

interface HeaderProps {
  showAdminLink?: boolean;
}

export default function Header({ showAdminLink = true }: HeaderProps) {
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');
  const [appTagline, setAppTagline] = useState('Predict. Compete. Win.');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, showToggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Determine which menu items to show based on current route
  const showHomeLink = location.pathname !== '/';
  const showChampionsLink = location.pathname !== '/champions';
  const showAdminLinkInMenu = showAdminLink && !location.pathname.startsWith('/admin');

  useEffect(() => {
    loadSettings();
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
      setAppTagline(res.data.app_tagline || 'Predict. Compete. Win.');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleAdminClick = () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // User has a token, navigate to admin dashboard
      // AdminDashboard will validate the token and redirect to login if invalid
      navigate('/admin');
    } else {
      // No token, go directly to login
      navigate('/admin/login');
    }
  };

  return (
    <header className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg ${mobileHeaderContainerClasses}`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Logo - Centered on mobile, left-aligned on desktop */}
          <Link to="/" className={mobileLogoContainerClasses}>
            <span className="text-4xl">🏆</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{appTitle}</h1>
              <p className="text-xs md:text-sm text-blue-100">{appTagline}</p>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className={mobileNavigationDesktopClasses}>
            {/* Champions Button */}
            <Link to="/champions" className={championsButtonClasses}>
              🏆 Champions
            </Link>
            
            {/* Admin Button */}
            {showAdminLink && (
              <button 
                onClick={handleAdminClick}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Admin
              </button>
            )}
            
            {/* Theme Toggle Button - only show if theme mode allows */}
            {showToggle && (
              <button
                onClick={toggleTheme}
                className={themeToggleButtonClasses}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className={mobileNavigationMobileClasses} ref={mobileMenuRef}>
            {/* Hamburger Button */}
            <button
              onClick={toggleMobileMenu}
              className={mobileHamburgerButtonClasses}
              aria-label="Toggle mobile menu"
            >
              <svg className={mobileHamburgerIconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuOpen && (
              <div className={mobileDropdownMenuClasses}>
                {/* Champions Menu Item - only show if not on champions page */}
                {showChampionsLink && (
                  <Link 
                    to="/champions" 
                    className={`${mobileDropdownMenuItemClasses} ${mobileDropdownMenuItemSpecialClasses}`}
                    onClick={closeMobileMenu}
                  >
                    <div className={mobileDropdownMenuItemWithIconClasses}>
                      <span className={mobileDropdownMenuItemIconClasses}>🏆</span>
                      <span className={mobileDropdownMenuItemTextClasses}>Champions</span>
                    </div>
                  </Link>
                )}

                {/* Home Menu Item - only show if not on home page */}
                {showHomeLink && (
                  <Link 
                    to="/" 
                    className={mobileDropdownMenuItemClasses}
                    onClick={closeMobileMenu}
                  >
                    <div className={mobileDropdownMenuItemWithIconClasses}>
                      <span className={mobileDropdownMenuItemIconClasses}>🏠</span>
                      <span className={mobileDropdownMenuItemTextClasses}>Home</span>
                    </div>
                  </Link>
                )}

                {/* Admin Menu Item - show if showAdminLink is true and not on admin pages */}
                {showAdminLinkInMenu && (
                  <button 
                    onClick={() => {
                      handleAdminClick();
                      closeMobileMenu();
                    }}
                    className={`${mobileDropdownMenuItemClasses} ${mobileDropdownMenuItemAdminClasses}`}
                  >
                    <div className={mobileDropdownMenuItemWithIconClasses}>
                      <span className={mobileDropdownMenuItemIconClasses}>⚙️</span>
                      <span className={mobileDropdownMenuItemTextClasses}>Admin</span>
                    </div>
                  </button>
                )}

                {/* Theme Toggle Menu Item - only show if theme mode allows */}
                {showToggle && (
                  <button 
                    onClick={() => {
                      toggleTheme();
                      closeMobileMenu();
                    }}
                    className={`${mobileDropdownMenuItemClasses} ${mobileDropdownMenuItemThemeClasses}`}
                  >
                    <div className={mobileDropdownMenuItemWithIconClasses}>
                      <span className={mobileDropdownMenuItemIconClasses}>
                        {theme === 'light' ? '🌙' : '☀️'}
                      </span>
                      <span className={mobileDropdownMenuItemTextClasses}>
                        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
