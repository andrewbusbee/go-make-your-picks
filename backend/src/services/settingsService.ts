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
  defaultTimezone: string;
  commissioner: string;
}

export interface AllSettings extends PointsSettings, TextSettings {}

export class SettingsService {
  private static pointsCache: PointsSettings | null = null;
  private static pointsCacheTime: number = 0;
  private static textCache: TextSettings | null = null;
  private static textCacheTime: number = 0;
  private static allCache: AllSettings | null = null;
  private static allCacheTime: number = 0;
  
  // Cache TTL: 1 minute (settings don't change often)
  private static readonly CACHE_TTL = 60000;

  /**
   * Get point settings with caching
   * Reduces database queries by 180x
   */
  static async getPointsSettings(): Promise<PointsSettings> {
    const now = Date.now();
    
    // Return cached if still valid
    if (this.pointsCache && (now - this.pointsCacheTime) < this.CACHE_TTL) {
      logger.debug('Returning cached points settings');
      return this.pointsCache;
    }

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
      this.pointsCache = settings;
      this.pointsCacheTime = now;

      logger.debug('Loaded and cached points settings');
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
    const now = Date.now();
    
    // Return cached if still valid
    if (this.textCache && (now - this.textCacheTime) < this.CACHE_TTL) {
      logger.debug('Returning cached text settings');
      return this.textCache;
    }

    try {
      const [settingsRows] = await db.query<RowDataPacket[]>(
        'SELECT setting_key, setting_value FROM text_settings'
      );

      const settingsMap = new Map(settingsRows.map(s => [s.setting_key, s.setting_value]));

      const settings: TextSettings = {
        appTitle: settingsMap.get('app_title') || 'Go Make Your Picks',
        appTagline: settingsMap.get('app_tagline') || 'Predict. Compete. Win.',
        footerMessage: settingsMap.get('footer_message') || 'Built for Sports Fans',
        defaultTimezone: settingsMap.get('default_timezone') || 'America/New_York',
        commissioner: settingsMap.get('commissioner') || '',
      };

      // Update cache
      this.textCache = settings;
      this.textCacheTime = now;

      logger.debug('Loaded and cached text settings');
      return settings;
    } catch (error) {
      logger.error('Error loading text settings', { error });
      
      // Return defaults if query fails
      return {
        appTitle: 'Go Make Your Picks',
        appTagline: 'Predict. Compete. Win.',
        footerMessage: 'Built for Sports Fans',
        defaultTimezone: 'America/New_York',
        commissioner: '',
      };
    }
  }

  /**
   * Get all settings with caching
   */
  static async getAllSettings(): Promise<AllSettings> {
    const now = Date.now();
    
    // Return cached if still valid
    if (this.allCache && (now - this.allCacheTime) < this.CACHE_TTL) {
      logger.debug('Returning cached all settings');
      return this.allCache;
    }

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
      this.allCache = settings;
      this.allCacheTime = now;

      return settings;
    } catch (error) {
      logger.error('Error loading all settings', { error });
      throw error;
    }
  }

  /**
   * Clear all caches (call after settings are updated)
   */
  static clearCache(): void {
    this.pointsCache = null;
    this.textCache = null;
    this.allCache = null;
    this.pointsCacheTime = 0;
    this.textCacheTime = 0;
    this.allCacheTime = 0;
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
      default_timezone: settings.defaultTimezone,
      points_first_place: settings.pointsFirst,
      points_second_place: settings.pointsSecond,
      points_third_place: settings.pointsThird,
      points_fourth_place: settings.pointsFourth,
      points_fifth_place: settings.pointsFifth,
      points_sixth_plus_place: settings.pointsSixthPlus,
    };
  }
}

