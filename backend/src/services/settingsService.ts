/**
 * Settings Service
 * Centralized settings management with caching
 * Eliminates duplicate queries across the codebase
 */

import db from '../config/database';
import { RowDataPacket } from 'mysql2';
import logger from '../utils/logger';

export interface PointsSettings {
  pointsFirst: number;
  pointsSecond: number;
  pointsThird: number;
  pointsFourth: number;
  pointsFifth: number;
  pointsSixthPlus: number;
}

export interface TextSettings {
  appTitle: string;
  appTagline: string;
  footerMessage: string;
  reminderType: string;
  dailyReminderTime: string;
  reminderTimezone: string;
  themeMode: string;
}

export interface ReminderSettings {
  reminderType: string;
  dailyReminderTime: string;
  reminderTimezone: string;
  firstReminderHours: number;
  finalReminderHours: number;
  sendAdminSummary: boolean;
}

export interface AllSettings extends PointsSettings, TextSettings {}

// Unified cache entry interface
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class SettingsService {
  // Unified cache storage
  private static cache = new Map<string, CacheEntry<any>>();
  
  // Cache TTL: 1 minute (settings don't change often)
  private static readonly CACHE_TTL = 60000;
  
  /**
   * Generic cache get method with TTL validation
   */
  private static getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && (Date.now() - entry.timestamp) < this.CACHE_TTL) {
      logger.debug(`Cache hit for ${key}`);
      return entry.value as T;
    }
    logger.debug(`Cache miss for ${key}`);
    return null;
  }
  
  /**
   * Generic cache set method
   */
  private static setCache<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    logger.debug(`Cache updated for ${key}`);
  }

  /**
   * Get point settings with caching
   * Reduces database queries by 180x
   */
  static async getPointsSettings(): Promise<PointsSettings> {
    // Try cache first
    const cached = this.getCached<PointsSettings>('points');
    if (cached) return cached;

    try {
      const [settingsRows] = await db.query<RowDataPacket[]>(
        'SELECT setting_key, setting_value FROM numeric_settings WHERE setting_key LIKE ?',
        ['points_%']
      );

      const settings: PointsSettings = {
        pointsFirst: settingsRows.find(s => s.setting_key === 'points_first_place')?.setting_value || 6,
        pointsSecond: settingsRows.find(s => s.setting_key === 'points_second_place')?.setting_value || 5,
        pointsThird: settingsRows.find(s => s.setting_key === 'points_third_place')?.setting_value || 4,
        pointsFourth: settingsRows.find(s => s.setting_key === 'points_fourth_place')?.setting_value || 3,
        pointsFifth: settingsRows.find(s => s.setting_key === 'points_fifth_place')?.setting_value || 2,
        pointsSixthPlus: settingsRows.find(s => s.setting_key === 'points_sixth_plus_place')?.setting_value || 1,
      };

      // Update cache
      this.setCache('points', settings);

      return settings;
    } catch (error) {
      logger.error('Error loading points settings', { error });
      
      // Return defaults if query fails
      return {
        pointsFirst: 6,
        pointsSecond: 5,
        pointsThird: 4,
        pointsFourth: 3,
        pointsFifth: 2,
        pointsSixthPlus: 1,
      };
    }
  }

  /**
   * Get text settings with caching
   */
  static async getTextSettings(): Promise<TextSettings> {
    // Try cache first
    const cached = this.getCached<TextSettings>('text');
    if (cached) return cached;

    try {
      const [settingsRows] = await db.query<RowDataPacket[]>(
        'SELECT setting_key, setting_value FROM text_settings'
      );

      const settingsMap = new Map(settingsRows.map(s => [s.setting_key, s.setting_value]));

      const settings: TextSettings = {
        appTitle: settingsMap.get('app_title') || 'Go Make Your Picks',
        appTagline: settingsMap.get('app_tagline') || 'Predict. Compete. Win.',
        footerMessage: settingsMap.get('footer_message') || 'Built for Sports Fans',
        reminderType: settingsMap.get('reminder_type') || 'daily',
        dailyReminderTime: settingsMap.get('daily_reminder_time') || '10:00:00',
        reminderTimezone: settingsMap.get('reminder_timezone') || 'America/New_York',
        themeMode: settingsMap.get('theme_mode') || 'user_choice',
      };

      // Update cache
      this.setCache('text', settings);

      return settings;
    } catch (error) {
      logger.error('Error loading text settings', { error });
      
      // Return defaults if query fails
      return {
        appTitle: 'Go Make Your Picks',
        appTagline: 'Predict. Compete. Win.',
        footerMessage: 'Built for Sports Fans',
        reminderType: 'daily',
        dailyReminderTime: '10:00:00',
        reminderTimezone: 'America/New_York',
        themeMode: 'user_choice',
      };
    }
  }

  /**
   * Get all settings with caching
   */
  static async getAllSettings(): Promise<AllSettings> {
    // Try cache first
    const cached = this.getCached<AllSettings>('all');
    if (cached) return cached;

    try {
      const [textSettings, pointsSettings] = await Promise.all([
        this.getTextSettings(),
        this.getPointsSettings()
      ]);

      const settings = {
        ...textSettings,
        ...pointsSettings
      };

      // Update cache
      this.setCache('all', settings);

      return settings;
    } catch (error) {
      logger.error('Error loading all settings', { error });
      throw error;
    }
  }

  /**
   * Get reminder settings with caching
   */
  static async getReminderSettings(): Promise<ReminderSettings> {
    // Try cache first
    const cached = this.getCached<ReminderSettings>('reminder');
    if (cached) return cached;

    try {
      // Get numeric reminder settings
      const [numericRows] = await db.query<RowDataPacket[]>(
        'SELECT setting_key, setting_value FROM numeric_settings WHERE setting_key LIKE ?',
        ['reminder_%']
      );

      // Get text reminder settings
      const [textRows] = await db.query<RowDataPacket[]>(
        'SELECT setting_key, setting_value FROM text_settings WHERE setting_key IN (?, ?, ?)',
        ['reminder_type', 'daily_reminder_time', 'reminder_timezone']
      );

      // Get send_admin_summary from settings table
      const [settingsRows] = await db.query<RowDataPacket[]>(
        'SELECT send_admin_summary FROM settings LIMIT 1'
      );

      const numericMap = new Map(numericRows.map(s => [s.setting_key, s.setting_value]));
      const textMap = new Map(textRows.map(s => [s.setting_key, s.setting_value]));

      const settings: ReminderSettings = {
        reminderType: textMap.get('reminder_type') || 'daily',
        dailyReminderTime: textMap.get('daily_reminder_time') || '10:00:00',
        reminderTimezone: textMap.get('reminder_timezone') || 'America/New_York',
        firstReminderHours: numericMap.get('reminder_first_hours') || 48,
        finalReminderHours: numericMap.get('reminder_final_hours') || 6,
        sendAdminSummary: settingsRows.length > 0 ? settingsRows[0].send_admin_summary === 1 : true,
      };

      // Update cache
      this.setCache('reminder', settings);

      return settings;
    } catch (error) {
      logger.error('Error loading reminder settings', { error });
      
      // Return defaults if query fails
      return {
        reminderType: 'daily',
        dailyReminderTime: '10:00:00',
        reminderTimezone: 'America/New_York',
        firstReminderHours: 48,
        finalReminderHours: 6,
        sendAdminSummary: true,
      };
    }
  }

  /**
   * Get point settings for a specific season
   * For ended seasons: returns historical point settings from season_winners table
   * For active seasons: returns current point settings
   * This ensures historical data remains accurate even if point settings are changed
   */
  static async getPointsSettingsForSeason(seasonId: number): Promise<PointsSettings> {
    try {
      // Check if season is ended and has winner data with point settings
      const [seasonData] = await db.query<RowDataPacket[]>(
        `SELECT s.ended_at, sw.points_first_place, sw.points_second_place, 
                sw.points_third_place, sw.points_fourth_place, sw.points_fifth_place, 
                sw.points_sixth_plus_place
         FROM seasons s
         LEFT JOIN season_winners sw ON s.id = sw.season_id
         WHERE s.id = ?
         LIMIT 1`,
        [seasonId]
      );

      if (seasonData.length === 0) {
        logger.warn('Season not found, using current settings', { seasonId });
        return await this.getPointsSettings();
      }

      const season = seasonData[0];

      // If season is ended and has historical point settings, use those
      if (season.ended_at && season.points_first_place !== null) {
        logger.debug('Using historical point settings for ended season', { seasonId });
        return {
          pointsFirst: season.points_first_place,
          pointsSecond: season.points_second_place,
          pointsThird: season.points_third_place,
          pointsFourth: season.points_fourth_place,
          pointsFifth: season.points_fifth_place,
          pointsSixthPlus: season.points_sixth_plus_place,
        };
      }

      // For active seasons or ended seasons without historical data, use current settings
      logger.debug('Using current point settings for active season', { seasonId });
      return await this.getPointsSettings();
    } catch (error) {
      logger.error('Error loading season-specific point settings', { error, seasonId });
      // Fall back to current settings on error
      return await this.getPointsSettings();
    }
  }

  /**
   * Clear all caches (call after settings are updated)
   */
  static clearCache(): void {
    this.cache.clear();
    logger.info('Settings cache cleared');
  }

  /**
   * Legacy compatibility: Get settings in old format
   */
  static async getSettingsObject(): Promise<Record<string, any>> {
    const settings = await this.getAllSettings();
    
    return {
      app_title: settings.appTitle,
      app_tagline: settings.appTagline,
      footer_message: settings.footerMessage,
      points_first_place: settings.pointsFirst,
      points_second_place: settings.pointsSecond,
      points_third_place: settings.pointsThird,
      points_fourth_place: settings.pointsFourth,
      points_fifth_place: settings.pointsFifth,
      points_sixth_plus_place: settings.pointsSixthPlus,
    };
  }
}

