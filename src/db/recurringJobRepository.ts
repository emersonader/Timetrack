import { getDatabase } from './database';
import {
  RecurringJob,
  CreateRecurringJobInput,
  UpdateRecurringJobInput,
  RecurringJobOccurrence,
  OccurrenceStatus,
} from '../types';

// Helper to cast SQLite integers to booleans
function castJob(row: any): RecurringJob {
  return {
    ...row,
    auto_invoice: Boolean(row.auto_invoice),
    is_active: Boolean(row.is_active),
  };
}

// ─── Recurring Job CRUD ──────────────────────────────────────

export async function getAllRecurringJobs(): Promise<RecurringJob[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM recurring_jobs ORDER BY created_at DESC'
  );
  return rows.map(castJob);
}

export async function getActiveRecurringJobs(): Promise<RecurringJob[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM recurring_jobs WHERE is_active = 1 ORDER BY created_at DESC'
  );
  return rows.map(castJob);
}

export async function getRecurringJobsByClientId(clientId: number): Promise<RecurringJob[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM recurring_jobs WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
  return rows.map(castJob);
}

export async function getRecurringJobById(id: number): Promise<RecurringJob | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM recurring_jobs WHERE id = ?',
    [id]
  );
  return row ? castJob(row) : null;
}

export async function createRecurringJob(input: CreateRecurringJobInput): Promise<RecurringJob> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO recurring_jobs (client_id, title, frequency, day_of_week, day_of_month, duration_seconds, notes, auto_invoice, is_active, start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [
      input.client_id,
      input.title.trim(),
      input.frequency,
      input.day_of_week,
      input.day_of_month ?? null,
      input.duration_seconds,
      input.notes?.trim() || null,
      input.auto_invoice ? 1 : 0,
      input.start_date,
      input.end_date ?? null,
      now,
      now,
    ]
  );

  const job = await getRecurringJobById(result.lastInsertRowId);
  if (!job) throw new Error('Failed to create recurring job');
  return job;
}

export async function updateRecurringJob(
  id: number,
  input: UpdateRecurringJobInput
): Promise<RecurringJob> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (input.client_id !== undefined) {
    updates.push('client_id = ?');
    values.push(input.client_id);
  }
  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title.trim());
  }
  if (input.frequency !== undefined) {
    updates.push('frequency = ?');
    values.push(input.frequency);
  }
  if (input.day_of_week !== undefined) {
    updates.push('day_of_week = ?');
    values.push(input.day_of_week);
  }
  if (input.day_of_month !== undefined) {
    updates.push('day_of_month = ?');
    values.push(input.day_of_month);
  }
  if (input.duration_seconds !== undefined) {
    updates.push('duration_seconds = ?');
    values.push(input.duration_seconds);
  }
  if (input.notes !== undefined) {
    updates.push('notes = ?');
    values.push(input.notes?.trim() || null);
  }
  if (input.auto_invoice !== undefined) {
    updates.push('auto_invoice = ?');
    values.push(input.auto_invoice ? 1 : 0);
  }
  if (input.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(input.is_active ? 1 : 0);
  }
  if (input.start_date !== undefined) {
    updates.push('start_date = ?');
    values.push(input.start_date);
  }
  if (input.end_date !== undefined) {
    updates.push('end_date = ?');
    values.push(input.end_date);
  }

  values.push(id);

  await db.runAsync(
    `UPDATE recurring_jobs SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const job = await getRecurringJobById(id);
  if (!job) throw new Error('Recurring job not found');
  return job;
}

export async function deleteRecurringJob(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM recurring_jobs WHERE id = ?', [id]);
}

export async function updateLastGeneratedDate(id: number, date: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE recurring_jobs SET last_generated_date = ?, updated_at = ? WHERE id = ?',
    [date, new Date().toISOString(), id]
  );
}

// ─── Occurrence CRUD ─────────────────────────────────────────

export async function getOccurrencesByJobId(
  recurringJobId: number
): Promise<RecurringJobOccurrence[]> {
  const db = await getDatabase();
  return db.getAllAsync<RecurringJobOccurrence>(
    'SELECT * FROM recurring_job_occurrences WHERE recurring_job_id = ? ORDER BY scheduled_date DESC',
    [recurringJobId]
  );
}

export async function createOccurrence(
  recurringJobId: number,
  scheduledDate: string
): Promise<void> {
  const db = await getDatabase();
  // INSERT OR IGNORE makes this idempotent via unique index
  await db.runAsync(
    'INSERT OR IGNORE INTO recurring_job_occurrences (recurring_job_id, scheduled_date) VALUES (?, ?)',
    [recurringJobId, scheduledDate]
  );
}

export async function updateOccurrenceStatus(
  id: number,
  status: OccurrenceStatus,
  updates?: { session_id?: number; invoice_id?: number }
): Promise<void> {
  const db = await getDatabase();

  const setClauses: string[] = ['status = ?'];
  const values: (string | number | null)[] = [status];

  if (updates?.session_id !== undefined) {
    setClauses.push('session_id = ?');
    values.push(updates.session_id);
  }
  if (updates?.invoice_id !== undefined) {
    setClauses.push('invoice_id = ?');
    values.push(updates.invoice_id);
  }

  values.push(id);

  await db.runAsync(
    `UPDATE recurring_job_occurrences SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );
}

interface PendingOccurrenceRow extends RecurringJobOccurrence {
  client_id: number;
  duration_seconds: number;
  job_notes: string | null;
  auto_invoice: number;
  job_title: string;
}

export async function getPendingOccurrencesUpTo(
  date: string
): Promise<PendingOccurrenceRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PendingOccurrenceRow>(
    `SELECT o.*, rj.client_id, rj.duration_seconds, rj.notes AS job_notes,
            rj.auto_invoice, rj.title AS job_title
     FROM recurring_job_occurrences o
     JOIN recurring_jobs rj ON o.recurring_job_id = rj.id
     WHERE o.status = 'pending' AND o.scheduled_date <= ?
     ORDER BY o.scheduled_date ASC`,
    [date]
  );
  return rows;
}
