import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  showAdminLink?: boolean;
}

export default function Header({ showAdminLink = true }: HeaderProps) {
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');
  const [appTagline, setAppTagline] = useState('Predict. Compete. Win.');
  const { theme, toggleTheme } = useTheme();

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
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 text-2xl"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {showAdminLink && (
              <Link 
                to="/admin/login" 
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
