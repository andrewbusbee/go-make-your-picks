import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import logger from '../utils/logger';

type Theme = 'light' | 'dark';
type ThemeMode = 'dark_only' | 'light_only' | 'user_choice';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  showToggle: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('user_choice');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch theme mode from settings API
  useEffect(() => {
    const fetchThemeMode = async () => {
      try {
        const res = await api.get('/public/settings');
        const mode = (res.data.theme_mode || 'user_choice') as ThemeMode;
        setThemeMode(mode);

        // Determine initial theme based on mode
        if (mode === 'dark_only') {
          setTheme('dark');
        } else if (mode === 'light_only') {
          setTheme('light');
        } else {
          // user_choice: check localStorage, default to dark
          const saved = localStorage.getItem('theme');
          setTheme((saved as Theme) || 'dark');
        }
      } catch (error) {
        logger.error('Error fetching theme mode:', error);
        // Fallback to user_choice with dark default
        setThemeMode('user_choice');
        const saved = localStorage.getItem('theme');
        setTheme((saved as Theme) || 'dark');
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemeMode();
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Only save to localStorage in user_choice mode
    if (themeMode === 'user_choice') {
      localStorage.setItem('theme', theme);
    }
  }, [theme, themeMode]);

  const toggleTheme = () => {
    // Only allow toggling in user_choice mode
    if (themeMode === 'user_choice') {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }
  };

  const showToggle = themeMode === 'user_choice';

  // Show loading state to prevent flash of wrong theme
  if (isLoading) {
    return null; // or a loading spinner if desired
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, showToggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
