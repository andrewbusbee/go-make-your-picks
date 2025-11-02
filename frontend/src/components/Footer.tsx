// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { useEffect, useState } from 'react';
import api from '../utils/api';
import logger from '../utils/logger';
import { bodyTextClasses, dividerClasses } from '../styles/commonClasses';

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
      logger.error('Error loading footer settings:', error);
    }
  };

  return (
    <footer className={`fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-gray-800 shadow-md ${dividerClasses} py-3 md:py-2 z-40`}>
      <div className="container mx-auto px-4">
        <div className={`flex flex-col md:flex-row justify-between items-center text-sm ${bodyTextClasses}`}>
          {/* Left: Software attribution (desktop only) */}
          <div className="hidden md:block">
            Powered by{' '}
            <a 
              href={`https://github.com/andrewbusbee/go-make-your-picks`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              Go Make Your Picks
            </a>
          </div>
          
          {/* Center: Footer message (mobile only) */}
          <div className="block md:hidden text-center">
            {footerMessage}
          </div>
          
          {/* Center: Footer message (desktop) */}
          <div className="hidden md:block text-center">
            {footerMessage}
          </div>
          
          {/* Right: Copyright (desktop only) */}
          <div className="hidden md:block text-xs text-gray-500 dark:text-gray-400">
            © 2025{new Date().getFullYear() > 2025 ? `-${new Date().getFullYear()}` : ''} <a href="https://andrewbusbee.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Andrew Busbee</a>. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
