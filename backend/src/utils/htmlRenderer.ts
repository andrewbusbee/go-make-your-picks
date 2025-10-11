import fs from 'fs';
import path from 'path';
import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from './logger';

interface Settings {
  app_title: string;
  app_tagline: string;
}

let htmlTemplate: string | null = null;
let cachedSettings: Settings | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // Cache for 30 seconds

/**
 * Load the HTML template from disk
 */
function loadHtmlTemplate(frontendPath: string): string {
  if (!htmlTemplate) {
    const indexPath = path.join(frontendPath, 'index.html');
    htmlTemplate = fs.readFileSync(indexPath, 'utf-8');
    logger.info('Loaded HTML template for dynamic meta tag injection');
  }
  return htmlTemplate;
}

/**
 * Get settings from database with caching
 */
async function getSettings(): Promise<Settings> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (cachedSettings && (now - lastCacheTime) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const [textSettings] = await db.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM text_settings WHERE setting_key IN (?, ?)',
      ['app_title', 'app_tagline']
    );

    const settings: Settings = {
      app_title: 'Go Make Your Picks',
      app_tagline: 'Predict. Compete. Win.'
    };

    textSettings.forEach((setting) => {
      if (setting.setting_key === 'app_title') {
        settings.app_title = setting.setting_value;
      } else if (setting.setting_key === 'app_tagline') {
        settings.app_tagline = setting.setting_value;
      }
    });

    cachedSettings = settings;
    lastCacheTime = now;
    
    return settings;
  } catch (error) {
    logger.error('Error loading settings for HTML rendering', { error });
    // Return defaults on error
    return {
      app_title: 'Go Make Your Picks',
      app_tagline: 'Predict. Compete. Win.'
    };
  }
}

/**
 * Clear the settings cache (call this when settings are updated)
 */
export function clearHtmlSettingsCache() {
  cachedSettings = null;
  lastCacheTime = 0;
  logger.info('HTML settings cache cleared');
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Render the HTML with dynamic meta tags injected
 */
export async function renderHtmlWithMeta(frontendPath: string): Promise<string> {
  const template = loadHtmlTemplate(frontendPath);
  const settings = await getSettings();

  // Escape settings to prevent XSS
  const title = escapeHtml(settings.app_title);
  const description = escapeHtml(settings.app_tagline);

  // Replace the title
  let html = template.replace(
    /<title>.*?<\/title>/,
    `<title>${title}</title>`
  );

  // Replace Open Graph title
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/,
    `<meta property="og:title" content="${title}" />`
  );

  // Replace Open Graph description
  html = html.replace(
    /<meta property="og:description" content=".*?" \/>/,
    `<meta property="og:description" content="${description}" />`
  );

  // Replace Twitter title
  html = html.replace(
    /<meta name="twitter:title" content=".*?" \/>/,
    `<meta name="twitter:title" content="${title}" />`
  );

  // Replace Twitter description
  html = html.replace(
    /<meta name="twitter:description" content=".*?" \/>/,
    `<meta name="twitter:description" content="${description}" />`
  );

  // Replace general meta description
  html = html.replace(
    /<meta name="description" content=".*?" \/>/,
    `<meta name="description" content="${description}" />`
  );

  return html;
}

