import { Migration } from './Migration';
import db from '../config/database';
import logger from '../utils/logger';

export default class AddCompleteRoundSelectionMethod implements Migration {
  id = '20250122000000_add_complete_round_selection_method';
  description = 'Add complete_round_selection_method setting for team selection in complete round modal';

  async up(): Promise<void> {
    // Check if the setting already exists
    const [existingSettings] = await db.query(
      'SELECT setting_key FROM text_settings WHERE setting_key = ?',
      ['complete_round_selection_method']
    ) as any;

    if (existingSettings.length > 0) {
      logger.info('complete_round_selection_method setting already exists, skipping migration');
      return;
    }

    await db.query(`
      INSERT INTO text_settings (setting_key, setting_value) 
      VALUES ('complete_round_selection_method', 'player_picks')
    `);
    logger.info('Successfully added complete_round_selection_method setting');
  }

  async down(): Promise<void> {
    await db.query(`
      DELETE FROM text_settings 
      WHERE setting_key = 'complete_round_selection_method'
    `);
  }
}
