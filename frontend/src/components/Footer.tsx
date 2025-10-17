import { useEffect, useState } from 'react';
import api from '../utils/api';
import packageJson from '../../package.json';
import { bodyTextClasses, dividerClasses, cardClasses } from '../styles/commonClasses';

export default function Footer() {
  const [footerMessage, setFooterMessage] = useState('Built for Sports Fans');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      setFooterMessage(res.data.footer_message || 'Built for Sports Fans');
    } catch (error) {
      console.error('Error loading footer settings:', error);
    }
  };

  return (
    <footer className={`fixed bottom-0 left-0 right-0 w-full ${cardClasses} ${dividerClasses} py-3 md:py-2 z-10 rounded-none`}>
      <div className="container mx-auto px-4">
        <div className={`flex flex-col md:flex-row justify-between items-center text-sm ${bodyTextClasses}`}>
          {/* Left: Software attribution (hidden on mobile) */}
          <div className="hidden md:block">
            Built with{' '}
            <a 
              href={`https://github.com/andrewbusbee/go-make-your-picks`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              Go Make Your Picks
            </a>
          </div>
          
          {/* Right: Footer message (centered on mobile, right on desktop) */}
          <div className="text-center md:text-right">
            {footerMessage}
          </div>
        </div>
      </div>
    </footer>
  );
}
