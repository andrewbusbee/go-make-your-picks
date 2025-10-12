import express, { Response } from 'express';
import { authenticateAdmin, requireMainAdmin, AuthRequest } from '../middleware/auth';
import db from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { isValidTimezone } from '../utils/timezones';
import logger from '../utils/logger';
import { SettingsService } from '../services/settingsService';
import { clearHtmlSettingsCache } from '../utils/htmlRenderer';

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

    // Convert to key-value object with defaults
    const settingsObj: any = {
      app_title: 'Go Make Your Picks',
      app_tagline: 'Predict. Compete. Win.',
      footer_message: 'Built for Sports Fans',
      default_timezone: 'America/New_York',
      points_first_place: 6,
      points_second_place: 5,
      points_third_place: 4,
      points_fourth_place: 3,
      points_fifth_place: 2,
      points_sixth_plus_place: 1,
      reminder_type: 'before_lock',
      daily_reminder_time: '10:00:00',
      reminder_first_hours: 48,
      reminder_final_hours: 6
    };
    
    textSettings.forEach((setting) => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    
    numericSettings.forEach((setting) => {
      settingsObj[setting.setting_key] = setting.setting_value; // Already INT
    });

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
    defaultTimezone,
    pointsFirstPlace,
    pointsSecondPlace,
    pointsThirdPlace,
    pointsFourthPlace,
    pointsFifthPlace,
    pointsSixthPlusPlace,
    reminderType,
    dailyReminderTime,
    reminderFirstHours,
    reminderFinalHours
  } = req.body;

  if (!appTitle || !appTagline || !footerMessage) {
    return res.status(400).json({ error: 'App title, tagline, and footer message are required' });
  }

  if (appTitle.length > 100 || appTagline.length > 200 || footerMessage.length > 100) {
    return res.status(400).json({ error: 'Title, tagline, or footer message is too long' });
  }

  // Validate timezone if provided
  if (defaultTimezone && !isValidTimezone(defaultTimezone)) {
    return res.status(400).json({ error: 'Invalid timezone. Please select a valid IANA timezone.' });
  }

  // Validate point values if provided
  const pointFields = [
    { name: 'First place', value: pointsFirstPlace },
    { name: 'Second place', value: pointsSecondPlace },
    { name: 'Third place', value: pointsThirdPlace },
    { name: 'Fourth place', value: pointsFourthPlace },
    { name: 'Fifth place', value: pointsFifthPlace },
    { name: 'Sixth place and below', value: pointsSixthPlusPlace }
  ];

  for (const field of pointFields) {
    if (field.value !== undefined) {
      const points = parseInt(field.value);
      if (isNaN(points) || points < 0 || points > 20) {
        return res.status(400).json({ error: `${field.name} points must be between 0 and 20` });
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
    if (isNaN(hours) || hours < 1 || hours > 48) {
      return res.status(400).json({ error: 'Final reminder hours must be between 1 and 48' });
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
    if (!['daily', 'before_lock'].includes(reminderType)) {
      return res.status(400).json({ error: 'Reminder type must be either "daily" or "before_lock"' });
    }
  }

  // Validate daily reminder time if provided
  if (dailyReminderTime !== undefined) {
    if (!dailyReminderTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)) {
      return res.status(400).json({ error: 'Daily reminder time must be in HH:MM:SS format' });
    }
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

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

    // Update default timezone if provided
    if (defaultTimezone) {
      await connection.query(
        `INSERT INTO text_settings (setting_key, setting_value) VALUES ('default_timezone', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [defaultTimezone]
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
      { key: 'points_sixth_plus_place', value: pointsSixthPlusPlace }
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

    await connection.commit();

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
        default_timezone: defaultTimezone,
        points_first_place: pointsFirstPlace,
        points_second_place: pointsSecondPlace,
        points_third_place: pointsThirdPlace,
        points_fourth_place: pointsFourthPlace,
        points_fifth_place: pointsFifthPlace,
        points_sixth_plus_place: pointsSixthPlusPlace
      }
    });
  } catch (error) {
    await connection.rollback();
    logger.error('Update settings error', { error });
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

export default router;
