import express, { Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import db from '../config/database';
import logger from '../utils/logger';
import { getDatabaseHealth } from '../utils/dbHealthCheck';

const router = express.Router();

// Admin-only: get connection status and basic health
router.get('/status', authenticateAdmin, async (req: Request, res: Response) => {
	try {
		const health = await getDatabaseHealth();
		res.json({
			status: health.status,
			latency: health.latency,
			uptimeSeconds: Math.floor(process.uptime()),
			timestamp: new Date().toISOString(),
			db: health
		});
	} catch (error: any) {
		logger.error('db-health status error', { error });
		res.status(500).json({ error: 'Failed to fetch DB status' });
	}
});

// Admin-only: get live schema (tables, columns, constraints, indexes)
router.get('/schema', authenticateAdmin, async (req: Request, res: Response) => {
	try {
		// Resolve current database/schema
		const [dbNameRows] = await db.query<any[]>(`SELECT DATABASE() as db`);
		const currentDb = dbNameRows[0]?.db;

		// Gather schema info from INFORMATION_SCHEMA
		const [tables] = await db.query<any[]>(
			`SELECT TABLE_NAME as table_name, ENGINE as engine, TABLE_ROWS as table_rows
			 FROM INFORMATION_SCHEMA.TABLES
			 WHERE TABLE_SCHEMA = DATABASE()
			 ORDER BY TABLE_NAME`
		);

		const [columns] = await db.query<any[]>(
			`SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, COLUMN_TYPE as column_type,
			 DATA_TYPE as data_type, IS_NULLABLE as is_nullable, COLUMN_DEFAULT as column_default,
			 COLUMN_KEY as column_key, EXTRA as extra
			 FROM INFORMATION_SCHEMA.COLUMNS
			 WHERE TABLE_SCHEMA = DATABASE()
			 ORDER BY TABLE_NAME, ORDINAL_POSITION`
		);

		const [tableConstraints] = await db.query<any[]>(
			`SELECT tc.TABLE_NAME as table_name, tc.CONSTRAINT_NAME as constraint_name,
			 tc.CONSTRAINT_TYPE as constraint_type
			 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
			 WHERE tc.TABLE_SCHEMA = DATABASE()
			 ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME`
		);

		const [keyColumnUsage] = await db.query<any[]>(
			`SELECT TABLE_NAME as table_name, CONSTRAINT_NAME as constraint_name,
			 COLUMN_NAME as column_name, REFERENCED_TABLE_NAME as referenced_table_name,
			 REFERENCED_COLUMN_NAME as referenced_column_name
			 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
			 WHERE TABLE_SCHEMA = DATABASE()
			 ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`
		);

		const [referential] = await db.query<any[]>(
			`SELECT CONSTRAINT_NAME as constraint_name, UNIQUE_CONSTRAINT_NAME as unique_constraint_name,
			 UPDATE_RULE as update_rule, DELETE_RULE as delete_rule
			 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
			 WHERE CONSTRAINT_SCHEMA = DATABASE()`
		);

		const [indexes] = await db.query<any[]>(
			`SELECT TABLE_NAME as table_name, INDEX_NAME as index_name, NON_UNIQUE as non_unique,
			 SEQ_IN_INDEX as seq_in_index, COLUMN_NAME as column_name, INDEX_TYPE as index_type
			 FROM INFORMATION_SCHEMA.STATISTICS
			 WHERE TABLE_SCHEMA = DATABASE()
			 ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`
		);

		res.json({
			database: currentDb,
			tables,
			columns,
			constraints: tableConstraints,
			keyColumnUsage,
			referential,
			indexes
		});
	} catch (error: any) {
		logger.error('db-health schema error', { error });
		res.status(500).json({ error: 'Failed to fetch DB schema' });
	}
});

export default router;
