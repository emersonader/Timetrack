import { getDatabase } from './database';
import { Invoice, CreateInvoiceInput } from '../types';

/**
 * Get all invoices
 */
export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Invoice>(
    'SELECT * FROM invoices ORDER BY created_at DESC'
  );
  return result;
}

/**
 * Get invoices for a client
 */
export async function getInvoicesByClientId(
  clientId: number
): Promise<Invoice[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Invoice>(
    'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
  return result;
}

/**
 * Get an invoice by ID
 */
export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Invoice>(
    'SELECT * FROM invoices WHERE id = ?',
    [id]
  );
  return result ?? null;
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  input: CreateInvoiceInput
): Promise<Invoice> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const sessionIdsJson = JSON.stringify(input.session_ids);

  const result = await db.runAsync(
    `INSERT INTO invoices (client_id, total_hours, total_amount, session_ids, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.client_id,
      input.total_hours,
      input.total_amount,
      sessionIdsJson,
      now,
    ]
  );

  const invoice = await getInvoiceById(result.lastInsertRowId);
  if (!invoice) {
    throw new Error('Failed to create invoice');
  }

  return invoice;
}

/**
 * Mark an invoice as sent
 */
export async function markInvoiceSent(
  invoiceId: number,
  method: 'email' | 'sms'
): Promise<Invoice> {
  const db = await getDatabase();
  const sentDate = new Date().toISOString();

  await db.runAsync(
    `UPDATE invoices SET sent_date = ?, send_method = ? WHERE id = ?`,
    [sentDate, method, invoiceId]
  );

  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  return invoice;
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM invoices WHERE id = ?', [id]);
}

/**
 * Get total amount invoiced for a client
 */
export async function getTotalInvoicedForClient(
  clientId: number
): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total_amount), 0) as total
     FROM invoices
     WHERE client_id = ?`,
    [clientId]
  );
  return result?.total ?? 0;
}

/**
 * Get invoice count
 */
export async function getInvoiceCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM invoices'
  );
  return result?.count ?? 0;
}

/**
 * Get sent invoice count
 */
export async function getSentInvoiceCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM invoices WHERE sent_date IS NOT NULL'
  );
  return result?.count ?? 0;
}

/**
 * Get invoice count for the current month
 */
export async function getMonthlyInvoiceCount(): Promise<number> {
  const db = await getDatabase();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM invoices WHERE created_at >= ?',
    [monthStart]
  );
  return result?.count ?? 0;
}

/**
 * Parse session IDs from invoice
 */
export function parseSessionIds(sessionIdsJson: string): number[] {
  try {
    const parsed = JSON.parse(sessionIdsJson);
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter((n) => !isNaN(n));
    }
    return [];
  } catch {
    return [];
  }
}
