import { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import logger from '../../utils/logger';
import {
	activeSectionHeaderClasses,
	bodyTextClasses,
	cardClasses
} from '../../styles/commonClasses';

interface DbStatus {
	status: string;
	version?: string;
	latency?: number;
	uptimeSeconds?: number;
	timestamp?: string;
	db?: any;
}

interface TableInfo {
	table_name: string;
	engine: string;
	table_rows: number;
	columns: any[];
	constraints: any[];
	foreignKeys: any[];
	referentialRules: any[];
	indexes: any[];
}

export default function DatabaseHealth() {
	const [status, setStatus] = useState<DbStatus | null>(null);
	const [schema, setSchema] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);
	const intervalRef = useRef<number | null>(null);

	const fetchAll = async () => {
		try {
			const [statusRes, schemaRes] = await Promise.all([
				api.get('/admin/db-health/status'),
				api.get('/admin/db-health/schema')
			]);
			setStatus(statusRes.data);
			setSchema(schemaRes.data);
			setLoading(false);
		} catch (error) {
			logger.error('Failed to load database health', error);
			setLoading(false);
		}
	};

	// Group schema data by table
	const groupByTable = (): TableInfo[] => {
		if (!schema) return [];

		const tablesMap = new Map<string, TableInfo>();

		// Initialize tables from tables array
		schema.tables?.forEach((table: any) => {
			tablesMap.set(table.table_name, {
				table_name: table.table_name,
				engine: table.engine,
				table_rows: table.table_rows,
				columns: [],
				constraints: [],
				foreignKeys: [],
				referentialRules: [],
				indexes: []
			});
		});

		// Group columns by table
		schema.columns?.forEach((col: any) => {
			const table = tablesMap.get(col.table_name);
			if (table) {
				table.columns.push(col);
			}
		});

		// Group constraints by table
		schema.constraints?.forEach((constraint: any) => {
			const table = tablesMap.get(constraint.table_name);
			if (table) {
				table.constraints.push(constraint);
			}
		});

		// Group foreign keys by table (keyColumnUsage where referenced_table_name is not null)
		schema.keyColumnUsage?.forEach((key: any) => {
			if (key.referenced_table_name) {
				const table = tablesMap.get(key.table_name);
				if (table) {
					table.foreignKeys.push(key);
				}
			}
		});

		// Group referential rules by table (need to match constraint names)
		const fkConstraintNames = new Set(
			schema.keyColumnUsage
				?.filter((k: any) => k.referenced_table_name)
				.map((k: any) => k.constraint_name) || []
		);

		schema.referential?.forEach((rule: any) => {
			if (fkConstraintNames.has(rule.constraint_name)) {
				// Find which table this constraint belongs to
				const keyUsage = schema.keyColumnUsage?.find(
					(k: any) => k.constraint_name === rule.constraint_name
				);
				if (keyUsage) {
					const table = tablesMap.get(keyUsage.table_name);
					if (table) {
						table.referentialRules.push(rule);
					}
				}
			}
		});

		// Group indexes by table
		schema.indexes?.forEach((index: any) => {
			const table = tablesMap.get(index.table_name);
			if (table) {
				// Check if index already exists (for composite indexes with multiple columns)
				const existingIndex = table.indexes.find(
					(i: any) => i.index_name === index.index_name
				);
				if (existingIndex) {
					// Add column to existing index
					if (!existingIndex.columns) {
						existingIndex.columns = [];
					}
					existingIndex.columns.push({
						column_name: index.column_name,
						seq_in_index: index.seq_in_index
					});
				} else {
					// Create new index entry
					table.indexes.push({
						index_name: index.index_name,
						non_unique: index.non_unique,
						index_type: index.index_type,
						columns: [
							{
								column_name: index.column_name,
								seq_in_index: index.seq_in_index
							}
						]
					});
				}
			}
		});

		return Array.from(tablesMap.values()).sort((a, b) =>
			a.table_name.localeCompare(b.table_name)
		);
	};

	useEffect(() => {
		// Initial load
		fetchAll();

		// Visibility-aware polling every 60s
		const startPolling = () => {
			if (intervalRef.current) return;
			intervalRef.current = window.setInterval(() => {
				if (document.visibilityState === 'visible') {
					fetchAll();
				}
			}, 60000);
		};

		const stopPolling = () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};

		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				startPolling();
			} else {
				// Pause while hidden
				stopPolling();
			}
		};

		document.addEventListener('visibilitychange', handleVisibility);
		startPolling();

		return () => {
			document.removeEventListener('visibilitychange', handleVisibility);
			stopPolling();
		};
	}, []);

	const tables = groupByTable();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className={activeSectionHeaderClasses}>Database Health</h2>
				{status && (
					<div className="text-sm text-gray-600 dark:text-gray-400">
						<span className="font-medium">Status:</span> {status.status}
						{status.latency !== undefined && (
							<span className="ml-3">
								<span className="font-medium">Ping:</span> {status.latency}ms
							</span>
						)}
						{schema?.database && (
							<span className="ml-3">
								<span className="font-medium">DB:</span> {schema.database}
							</span>
						)}
					</div>
				)}
			</div>

			{loading ? (
				<p className={bodyTextClasses}>Loading...</p>
			) : (
				<div className="space-y-6">
					{tables.map((table) => (
						<div key={table.table_name} className={cardClasses}>
							{/* Table Header */}
							<div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
										{table.table_name}
									</h3>
									<div className="text-sm text-gray-600 dark:text-gray-400">
										<span className="font-medium">Engine:</span> {table.engine}
										<span className="ml-4">
											<span className="font-medium">Rows:</span> {table.table_rows?.toLocaleString() || 'N/A'}
										</span>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								{/* Columns */}
								<div>
									<h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
										Columns ({table.columns.length})
									</h4>
									<div className="overflow-x-auto">
										<table className="min-w-full text-xs border-collapse">
											<thead>
												<tr className="bg-gray-50 dark:bg-gray-700">
													<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Column</th>
													<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Type</th>
													<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Nullable</th>
													<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Default</th>
													<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Key</th>
													<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Extra</th>
												</tr>
											</thead>
											<tbody>
												{table.columns.map((col: any, idx: number) => (
													<tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
														<td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{col.column_name}</td>
														<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{col.column_type}</td>
														<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{col.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
														<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{col.column_default || '-'}</td>
														<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{col.column_key || '-'}</td>
														<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{col.extra || '-'}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>

								{/* Constraints */}
								{table.constraints.length > 0 && (
									<div>
										<h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
											Constraints ({table.constraints.length})
										</h4>
										<div className="overflow-x-auto">
											<table className="min-w-full text-xs border-collapse">
												<thead>
													<tr className="bg-gray-50 dark:bg-gray-700">
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Name</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Type</th>
													</tr>
												</thead>
												<tbody>
													{table.constraints.map((constraint: any, idx: number) => (
														<tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
															<td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{constraint.constraint_name}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{constraint.constraint_type}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}

								{/* Foreign Keys */}
								{table.foreignKeys.length > 0 && (
									<div>
										<h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
											Foreign Keys ({table.foreignKeys.length})
										</h4>
										<div className="overflow-x-auto">
											<table className="min-w-full text-xs border-collapse">
												<thead>
													<tr className="bg-gray-50 dark:bg-gray-700">
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Constraint</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Column</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">References</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Referenced Column</th>
													</tr>
												</thead>
												<tbody>
													{table.foreignKeys.map((fk: any, idx: number) => (
														<tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
															<td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{fk.constraint_name}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{fk.column_name}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{fk.referenced_table_name}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{fk.referenced_column_name}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}

								{/* Referential Rules */}
								{table.referentialRules.length > 0 && (
									<div>
										<h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
											Referential Rules ({table.referentialRules.length})
										</h4>
										<div className="overflow-x-auto">
											<table className="min-w-full text-xs border-collapse">
												<thead>
													<tr className="bg-gray-50 dark:bg-gray-700">
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Constraint</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">ON DELETE</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">ON UPDATE</th>
													</tr>
												</thead>
												<tbody>
													{table.referentialRules.map((rule: any, idx: number) => (
														<tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
															<td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{rule.constraint_name}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{rule.delete_rule}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{rule.update_rule}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}

								{/* Indexes */}
								{table.indexes.length > 0 && (
									<div>
										<h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
											Indexes ({table.indexes.length})
										</h4>
										<div className="overflow-x-auto">
											<table className="min-w-full text-xs border-collapse">
												<thead>
													<tr className="bg-gray-50 dark:bg-gray-700">
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Index Name</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Unique</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Type</th>
														<th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">Columns</th>
													</tr>
												</thead>
												<tbody>
													{table.indexes.map((index: any, idx: number) => (
														<tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
															<td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{index.index_name}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{index.non_unique === 0 ? 'Yes' : 'No'}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">{index.index_type}</td>
															<td className="px-3 py-2 text-gray-700 dark:text-gray-300">
																{index.columns
																	?.sort((a: any, b: any) => a.seq_in_index - b.seq_in_index)
																	.map((c: any) => c.column_name)
																	.join(', ')}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
