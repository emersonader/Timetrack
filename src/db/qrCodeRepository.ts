import { getDatabase } from './database';
import { QRCode, CreateQRCodeInput } from '../types';

interface QRCodeWithClient extends QRCode {
  client_first_name: string;
  client_last_name: string;
}

/**
 * Get all QR codes with client names
 */
export async function getAllQRCodes(): Promise<QRCodeWithClient[]> {
  const db = await getDatabase();
  return db.getAllAsync<QRCodeWithClient>(
    `SELECT q.*, c.first_name AS client_first_name, c.last_name AS client_last_name
     FROM qr_codes q
     JOIN clients c ON q.client_id = c.id
     ORDER BY q.created_at DESC`
  );
}

/**
 * Get QR codes for a specific client
 */
export async function getQRCodesForClient(clientId: number): Promise<QRCodeWithClient[]> {
  const db = await getDatabase();
  return db.getAllAsync<QRCodeWithClient>(
    `SELECT q.*, c.first_name AS client_first_name, c.last_name AS client_last_name
     FROM qr_codes q
     JOIN clients c ON q.client_id = c.id
     WHERE q.client_id = ?
     ORDER BY q.created_at DESC`,
    [clientId]
  );
}

/**
 * Get a single QR code by ID
 */
export async function getQRCodeById(id: number): Promise<QRCode | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<QRCode>(
    'SELECT * FROM qr_codes WHERE id = ?',
    [id]
  );
  return result ?? null;
}

/**
 * Create a new QR code
 */
export async function createQRCode(input: CreateQRCodeInput): Promise<QRCode> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const codeData = JSON.stringify({
    type: 'hourflow_checkin',
    client_id: input.client_id,
    label: input.label,
    created_at: now,
  });

  const result = await db.runAsync(
    `INSERT INTO qr_codes (client_id, label, code_data, created_at)
     VALUES (?, ?, ?, ?)`,
    [input.client_id, input.label.trim(), codeData, now]
  );

  const newCode = await getQRCodeById(result.lastInsertRowId);
  if (!newCode) {
    throw new Error('Failed to create QR code');
  }

  return newCode;
}

/**
 * Delete a QR code
 */
export async function deleteQRCode(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM qr_codes WHERE id = ?', [id]);
}

/**
 * Find a QR code by its code_data (for scan matching)
 */
export async function findQRCodeByData(codeData: string): Promise<QRCode | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<QRCode>(
    'SELECT * FROM qr_codes WHERE code_data = ?',
    [codeData]
  );
  return result ?? null;
}
