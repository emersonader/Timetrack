import { getDatabase } from './database';
import { Receipt, CreateReceiptInput } from '../types';

/**
 * Get all receipts, ordered by date DESC, with client name joined if available
 */
export async function getAllReceipts(): Promise<(Receipt & { client_name: string | null })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Receipt & { client_name: string | null }>(
    `SELECT r.*,
       CASE WHEN c.id IS NOT NULL THEN c.first_name || ' ' || c.last_name ELSE NULL END AS client_name
     FROM receipts r
     LEFT JOIN clients c ON r.client_id = c.id
     ORDER BY r.date DESC`
  );
}

/**
 * Get a single receipt by ID
 */
export async function getReceiptById(id: number): Promise<Receipt | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Receipt>(
    'SELECT * FROM receipts WHERE id = ?',
    [id]
  );
  return result ?? null;
}

/**
 * Get all receipts for a specific client
 */
export async function getReceiptsForClient(clientId: number): Promise<Receipt[]> {
  const db = await getDatabase();
  return db.getAllAsync<Receipt>(
    'SELECT * FROM receipts WHERE client_id = ? ORDER BY date DESC',
    [clientId]
  );
}

/**
 * Create a new receipt
 */
export async function createReceipt(input: CreateReceiptInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO receipts (photo_path, vendor_name, total_amount, date, notes, category, client_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.photo_path,
      input.vendor_name ?? null,
      input.total_amount ?? null,
      input.date,
      input.notes ?? null,
      input.category ?? null,
      input.client_id ?? null,
    ]
  );
  return result.lastInsertRowId;
}

/**
 * Update an existing receipt
 */
export async function updateReceipt(
  id: number,
  updates: Partial<CreateReceiptInput> & { is_processed?: number }
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.photo_path !== undefined) {
    fields.push('photo_path = ?');
    values.push(updates.photo_path);
  }
  if (updates.vendor_name !== undefined) {
    fields.push('vendor_name = ?');
    values.push(updates.vendor_name ?? null);
  }
  if (updates.total_amount !== undefined) {
    fields.push('total_amount = ?');
    values.push(updates.total_amount ?? null);
  }
  if (updates.date !== undefined) {
    fields.push('date = ?');
    values.push(updates.date);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes ?? null);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category ?? null);
  }
  if (updates.client_id !== undefined) {
    fields.push('client_id = ?');
    values.push(updates.client_id ?? null);
  }
  if (updates.is_processed !== undefined) {
    fields.push('is_processed = ?');
    values.push(updates.is_processed);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(
    `UPDATE receipts SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
}

/**
 * Get receipt statistics
 */
export async function getReceiptStats(): Promise<{
  totalReceipts: number;
  totalAmount: number;
  unprocessedCount: number;
}> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    totalReceipts: number;
    totalAmount: number | null;
    unprocessedCount: number;
  }>(
    `SELECT
       COUNT(*) AS totalReceipts,
       COALESCE(SUM(total_amount), 0) AS totalAmount,
       SUM(CASE WHEN is_processed = 0 THEN 1 ELSE 0 END) AS unprocessedCount
     FROM receipts`
  );
  return {
    totalReceipts: row?.totalReceipts ?? 0,
    totalAmount: row?.totalAmount ?? 0,
    unprocessedCount: row?.unprocessedCount ?? 0,
  };
}
