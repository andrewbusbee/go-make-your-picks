import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import { themeToggleButtonClasses, championsButtonClasses } from '../styles/commonClasses';

interface HeaderProps {
  showAdminLink?: boolean;
}

export default function Header({ showAdminLink = true }: HeaderProps) {
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');
  const [appTagline, setAppTagline] = useState('Predict. Compete. Win.');
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, []);

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
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <span className="text-4xl">🏆</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{appTitle}</h1>
              <p className="text-xs md:text-sm text-blue-100">{appTagline}</p>
            </div>
          </Link>
          <div className="flex items-center space-x-3">
            {/* Champions Button */}
            <Link to="/champions" className={championsButtonClasses}>
              🏆 Champions
            </Link>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={themeToggleButtonClasses}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {showAdminLink && (
              <button 
                onClick={handleAdminClick}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
