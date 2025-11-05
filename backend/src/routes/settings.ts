// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import express, { Response } from 'express';
import { authenticateAdmin, requireMainAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { isValidTimezone } from '../utils/timezones';
import logger from '../utils/logger';
import { SettingsService } from '../services/settingsService';
import { clearHtmlSettingsCache } from '../utils/htmlRenderer';
import { withTransaction } from '../utils/transactionWrapper';

const router = express.Router();

// Get all settings (public - needed for frontend)
router.get('/', async (req, res) => {
  try {
    const [textSettings] = await db.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM text_settings'
    );
    
    const [numericSettings] = await db.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM numeric_settings'
    );

    // Get send_admin_summary from settings table
    const [settingsRows] = await db.query<RowDataPacket[]>(
      'SELECT send_admin_summary FROM settings LIMIT 1'
    );

    // Convert to key-value object with defaults
    const settingsObj: any = {
      app_title: 'Go Make Your Picks',
      app_tagline: 'Predict. Compete. Win.',
      footer_message: 'Built for Sports Fans',
      points_first_place: 7,
      points_second_place: 5,
      points_third_place: 4,
      points_fourth_place: 3,
      points_fifth_place: 2,
      points_sixth_plus_place: 1,
      points_no_pick: 0,
      reminder_type: 'daily',
      daily_reminder_time: '10:00:00',
      reminder_timezone: 'America/New_York',
      reminder_first_hours: 48,
      reminder_final_hours: 6,
      send_admin_summary: true,
      theme_mode: 'user_choice'
    };
    
    textSettings.forEach((setting) => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    
    numericSettings.forEach((setting) => {
      settingsObj[setting.setting_key] = setting.setting_value; // Already INT
    });

    // Add send_admin_summary from settings table
    if (settingsRows.length > 0) {
      settingsObj.send_admin_summary = settingsRows[0].send_admin_summary === 1;
    }

    res.json(settingsObj);
  } catch (error) {
    logger.error('Get settings error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update setting (all admins)
router.put('/', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { 
    appTitle, 
    appTagline, 
    footerMessage,
    themeMode,
    completeRoundSelectionMethod,
    pointsFirstPlace,
    pointsSecondPlace,
    pointsThirdPlace,
    pointsFourthPlace,
    pointsFifthPlace,
    pointsSixthPlusPlace,
    pointsNoPick,
    reminderType,
    dailyReminderTime,
    reminderTimezone,
    reminderFirstHours,
    reminderFinalHours,
    sendAdminSummary
  } = req.body;

  if (!appTitle || !appTagline || !footerMessage) {
    return res.status(400).json({ error: 'App title, tagline, and footer message are required' });
  }

  if (appTitle.length > 100 || appTagline.length > 200 || footerMessage.length > 100) {
    return res.status(400).json({ error: 'Title, tagline, or footer message is too long' });
  }


  // Validate reminder timezone if provided
  if (reminderTimezone && !isValidTimezone(reminderTimezone)) {
    return res.status(400).json({ error: 'Invalid reminder timezone. Please select a valid IANA timezone.' });
  }

  // Validate point values if provided
  const pointFields = [
    { name: 'First place', value: pointsFirstPlace },
    { name: 'Second place', value: pointsSecondPlace },
    { name: 'Third place', value: pointsThirdPlace },
    { name: 'Fourth place', value: pointsFourthPlace },
    { name: 'Fifth place', value: pointsFifthPlace },
    { name: 'Sixth place and below', value: pointsSixthPlusPlace },
    { name: 'No pick', value: pointsNoPick, allowNegative: true }
  ];

  for (const field of pointFields) {
    if (field.value !== undefined) {
      const points = parseInt(field.value);
      const minValue = field.allowNegative ? -10 : 0;
      if (isNaN(points) || points < minValue || points > 20) {
        return res.status(400).json({ error: `${field.name} points must be between ${minValue} and 20` });
      }
    }
  }

  // Validate reminder hours if provided
  if (reminderFirstHours !== undefined) {
    const hours = parseInt(reminderFirstHours);
    if (isNaN(hours) || hours < 2 || hours > 168) {
      return res.status(400).json({ error: 'First reminder hours must be between 2 and 168' });
    }
  }

  if (reminderFinalHours !== undefined) {
    const hours = parseInt(reminderFinalHours);
    if (isNaN(hours) || hours < 1 || hours > 45) {
      return res.status(400).json({ error: 'Final reminder hours must be between 1 and 45' });
    }
  }

  // Validate that first reminder is after final reminder
  if (reminderFirstHours !== undefined && reminderFinalHours !== undefined) {
    if (parseInt(reminderFirstHours) <= parseInt(reminderFinalHours)) {
      return res.status(400).json({ error: 'First reminder must be more hours before lock time than final reminder' });
    }
  }

  // Validate reminder type if provided
  if (reminderType !== undefined) {
    if (!['daily', 'before_lock', 'none'].includes(reminderType)) {
      return res.status(400).json({ error: 'Reminder type must be "daily", "before_lock", or "none"' });
    }
  }

  // Validate daily reminder time if provided
  if (dailyReminderTime !== undefined) {
    if (!dailyReminderTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)) {
      return res.status(400).json({ error: 'Daily reminder time must be in HH:MM:SS format' });
    }
  }

  // Validate theme mode if provided
  if (themeMode !== undefined) {
    if (!['dark_only', 'light_only', 'user_choice'].includes(themeMode)) {
      return res.status(400).json({ error: 'Theme mode must be "dark_only", "light_only", or "user_choice"' });
    }
  }

  // Validate complete round selection method if provided
  if (completeRoundSelectionMethod !== undefined) {
    if (!['current', 'player_picks'].includes(completeRoundSelectionMethod)) {
      return res.status(400).json({ error: 'Complete round selection method must be "current" or "player_picks"' });
    }
  }

  try {
    await withTransaction(async (connection) => {
      // Update or insert text settings
      await connection.query(
        `INSERT INTO text_settings (setting_key, setting_value) VALUES ('app_title', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [appTitle]
      );

      await connection.query(
        `INSERT INTO text_settings (setting_key, setting_value) VALUES ('app_tagline', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [appTagline]
      );

      await connection.query(
        `INSERT INTO text_settings (setting_key, setting_value) VALUES ('footer_message', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [footerMessage]
      );


      // Update theme mode if provided
      if (themeMode !== undefined) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('theme_mode', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [themeMode]
        );
      }

      // Update complete round selection method if provided
      if (completeRoundSelectionMethod !== undefined) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('complete_round_selection_method', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [completeRoundSelectionMethod]
        );
      }

      // Update reminder timezone if provided
      if (reminderTimezone) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('reminder_timezone', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [reminderTimezone]
        );
      }

      // Update reminder type if provided
      if (reminderType !== undefined) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('reminder_type', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [reminderType]
        );
      }

      // Update daily reminder time if provided
      if (dailyReminderTime !== undefined) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('daily_reminder_time', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [dailyReminderTime]
        );
      }

      // Update numeric point values if provided
      const pointSettings = [
        { key: 'points_first_place', value: pointsFirstPlace },
        { key: 'points_second_place', value: pointsSecondPlace },
        { key: 'points_third_place', value: pointsThirdPlace },
        { key: 'points_fourth_place', value: pointsFourthPlace },
        { key: 'points_fifth_place', value: pointsFifthPlace },
        { key: 'points_sixth_plus_place', value: pointsSixthPlusPlace },
        { key: 'points_no_pick', value: pointsNoPick }
      ];

      for (const setting of pointSettings) {
        if (setting.value !== undefined) {
          const intValue = parseInt(setting.value);
          await connection.query(
            `INSERT INTO numeric_settings (setting_key, setting_value, min_value, max_value) VALUES (?, ?, 0, 20)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [setting.key, intValue]
          );
        }
      }

      // Update reminder hours if provided
      if (reminderFirstHours !== undefined) {
        const intValue = parseInt(reminderFirstHours);
        await connection.query(
          `INSERT INTO numeric_settings (setting_key, setting_value, min_value, max_value) VALUES ('reminder_first_hours', ?, 2, 168)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [intValue]
        );
      }

      if (reminderFinalHours !== undefined) {
        const intValue = parseInt(reminderFinalHours);
        await connection.query(
          `INSERT INTO numeric_settings (setting_key, setting_value, min_value, max_value) VALUES ('reminder_final_hours', ?, 1, 48)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [intValue]
        );
      }

      // Update send_admin_summary if provided
      if (sendAdminSummary !== undefined) {
        await connection.query(
          `UPDATE settings SET send_admin_summary = ?`,
          [sendAdminSummary ? 1 : 0]
        );
      }
    });

    // Clear settings cache so new values are loaded immediately
    SettingsService.clearCache();
    
    // Also clear HTML renderer cache for meta tags
    clearHtmlSettingsCache();

    res.json({ 
      message: 'Settings updated successfully',
      settings: {
        app_title: appTitle,
        app_tagline: appTagline,
        footer_message: footerMessage,
        reminder_timezone: reminderTimezone,
        points_first_place: pointsFirstPlace,
        points_second_place: pointsSecondPlace,
        points_third_place: pointsThirdPlace,
        points_fourth_place: pointsFourthPlace,
        points_fifth_place: pointsFifthPlace,
        points_sixth_plus_place: pointsSixthPlusPlace,
        points_no_pick: pointsNoPick
      }
    });
  } catch (error) {
    logger.error('Update settings error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle email notifications (main admin only)
router.put('/email-notifications', authenticateAdmin, requireMainAdmin, async (req: AuthRequest, res: Response) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }

  try {
    // Update or insert the setting
    await db.query(
      `INSERT INTO text_settings (setting_key, setting_value) 
       VALUES ('email_notifications_enabled', ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [enabled ? 'true' : 'false', enabled ? 'true' : 'false']
    );

    logger.info('Email notifications toggled', { 
      adminId: req.adminId, 
      enabled 
    });

    res.json({ 
      message: `Email notifications ${enabled ? 'enabled' : 'disabled'}`,
      email_notifications_enabled: enabled ? 'true' : 'false'
    });
  } catch (error) {
    logger.error('Toggle email notifications error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update reminder settings only (all admins)
router.put('/reminders', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const {
    reminderType,
    dailyReminderTime,
    reminderTimezone,
    reminderFirstHours,
    reminderFinalHours,
    sendAdminSummary
  } = req.body;

  // Validate reminder type
  if (reminderType !== undefined) {
    if (!['daily', 'before_lock', 'none'].includes(reminderType)) {
      return res.status(400).json({ error: 'Reminder type must be "daily", "before_lock", or "none"' });
    }
  }

  // Validate reminder timezone if provided
  if (reminderTimezone && !isValidTimezone(reminderTimezone)) {
    return res.status(400).json({ error: 'Invalid reminder timezone. Please select a valid IANA timezone.' });
  }

  // Validate daily reminder time if provided
  if (dailyReminderTime !== undefined) {
    if (!dailyReminderTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)) {
      return res.status(400).json({ error: 'Daily reminder time must be in HH:MM:SS format' });
    }
  }

  // Validate reminder hours if provided
  if (reminderFirstHours !== undefined) {
    const hours = parseInt(reminderFirstHours);
    if (isNaN(hours) || hours < 2 || hours > 168) {
      return res.status(400).json({ error: 'First reminder hours must be between 2 and 168' });
    }
  }

  if (reminderFinalHours !== undefined) {
    const hours = parseInt(reminderFinalHours);
    if (isNaN(hours) || hours < 1 || hours > 45) {
      return res.status(400).json({ error: 'Final reminder hours must be between 1 and 45' });
    }
  }

  // Validate that first reminder is after final reminder
  if (reminderFirstHours !== undefined && reminderFinalHours !== undefined) {
    if (parseInt(reminderFirstHours) <= parseInt(reminderFinalHours)) {
      return res.status(400).json({ error: 'First reminder must be more hours before lock time than final reminder' });
    }
  }

  try {
    await withTransaction(async (connection) => {
      // Update reminder type if provided
      if (reminderType !== undefined) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('reminder_type', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [reminderType]
        );
      }

      // Update daily reminder time if provided
      if (dailyReminderTime !== undefined) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('daily_reminder_time', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [dailyReminderTime]
        );
      }

      // Update reminder timezone if provided
      if (reminderTimezone) {
        await connection.query(
          `INSERT INTO text_settings (setting_key, setting_value) VALUES ('reminder_timezone', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [reminderTimezone]
        );
      }

      // Update reminder hours if provided
      if (reminderFirstHours !== undefined) {
        const intValue = parseInt(reminderFirstHours);
        await connection.query(
          `INSERT INTO numeric_settings (setting_key, setting_value, min_value, max_value) VALUES ('reminder_first_hours', ?, 2, 168)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [intValue]
        );
      }

      if (reminderFinalHours !== undefined) {
        const intValue = parseInt(reminderFinalHours);
        await connection.query(
          `INSERT INTO numeric_settings (setting_key, setting_value, min_value, max_value) VALUES ('reminder_final_hours', ?, 1, 48)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [intValue]
        );
      }

      // Update send_admin_summary if provided
      if (sendAdminSummary !== undefined) {
        await connection.query(
          `UPDATE settings SET send_admin_summary = ?`,
          [sendAdminSummary ? 1 : 0]
        );
      }
    });

    // Clear settings cache so new values are loaded immediately
    SettingsService.clearCache();

    logger.info('Reminder settings updated', { 
      adminId: req.adminId,
      reminderType,
      sendAdminSummary
    });

    res.json({ 
      message: 'Reminder settings updated successfully',
      reminder_type: reminderType,
      send_admin_summary: sendAdminSummary
    });
  } catch (error) {
    logger.error('Update reminder settings error', { error });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
