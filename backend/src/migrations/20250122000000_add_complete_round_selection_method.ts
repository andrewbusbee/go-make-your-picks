import { Migration } from './Migration';
import db from '../config/database';

export default class AddCompleteRoundSelectionMethod implements Migration {
  id = '20250122000000_add_complete_round_selection_method';
  description = 'Add complete_round_selection_method setting for team selection in complete round modal';

  async up(): Promise<void> {
    await db.query(`
      INSERT INTO text_settings (setting_key, setting_value) 
      VALUES ('complete_round_selection_method', 'player_picks')
    `);
  }

  async down(): Promise<void> {
    await db.query(`
      DELETE FROM text_settings 
      WHERE setting_key = 'complete_round_selection_method'
    `);
  }
}
