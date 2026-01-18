import { getDatabase } from './database';
import { TimeSession, CreateSessionInput, ActiveTimer } from '../types';
import { formatDateForDb, formatDateTimeForDb } from '../utils/formatters';

/**
 * Get all sessions for a client
 */
export async function getSessionsByClientId(
  clientId: number
): Promise<TimeSession[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<TimeSession>(
    `SELECT id, client_id, start_time, end_time, duration, date,
            CAST(is_active AS INTEGER) as is_active, notes, created_at
     FROM time_sessions
     WHERE client_id = ?
     ORDER BY date DESC, start_time DESC`,
    [clientId]
  );

  return result.map((session) => ({
    ...session,
    is_active: Boolean(session.is_active),
  }));
}

/**
 * Get a session by ID
 */
export async function getSessionById(id: number): Promise<TimeSession | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<TimeSession>(
    `SELECT id, client_id, start_time, end_time, duration, date,
            CAST(is_active AS INTEGER) as is_active, notes, created_at
     FROM time_sessions
     WHERE id = ?`,
    [id]
  );

  if (!result) return null;

  return {
    ...result,
    is_active: Boolean(result.is_active),
  };
}

/**
 * Start a new time session
 */
export async function startSession(
  clientId: number
): Promise<TimeSession> {
  const db = await getDatabase();
  const now = new Date();
  const startTime = formatDateTimeForDb(now);
  const date = formatDateForDb(now);

  const result = await db.runAsync(
    `INSERT INTO time_sessions (client_id, start_time, date, is_active, created_at)
     VALUES (?, ?, ?, 1, ?)`,
    [clientId, startTime, date, startTime]
  );

  const session = await getSessionById(result.lastInsertRowId);
  if (!session) {
    throw new Error('Failed to create session');
  }

  // Update active_timer table
  await db.runAsync(
    `UPDATE active_timer
     SET client_id = ?, session_id = ?, start_time = ?, is_running = 1
     WHERE id = 1`,
    [clientId, session.id, startTime]
  );

  return session;
}

/**
 * Stop/end a time session
 */
export async function stopSession(sessionId: number, notes?: string): Promise<TimeSession> {
  const db = await getDatabase();
  const now = new Date();
  const endTime = formatDateTimeForDb(now);

  // Get the session to calculate duration
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Calculate duration in seconds
  const startDate = new Date(session.start_time);
  const duration = Math.floor((now.getTime() - startDate.getTime()) / 1000);

  await db.runAsync(
    `UPDATE time_sessions
     SET end_time = ?, duration = ?, is_active = 0, notes = ?
     WHERE id = ?`,
    [endTime, duration, notes || null, sessionId]
  );

  // Clear active_timer
  await db.runAsync(
    `UPDATE active_timer
     SET client_id = NULL, session_id = NULL, start_time = NULL, is_running = 0
     WHERE id = 1`
  );

  const updatedSession = await getSessionById(sessionId);
  if (!updatedSession) {
    throw new Error('Failed to update session');
  }

  return updatedSession;
}

/**
 * Get the active timer state
 */
export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    id: number;
    client_id: number | null;
    session_id: number | null;
    start_time: string | null;
    is_running: number;
  }>('SELECT * FROM active_timer WHERE id = 1');

  if (!result) return null;

  return {
    id: 1,
    client_id: result.client_id,
    session_id: result.session_id,
    start_time: result.start_time,
    is_running: Boolean(result.is_running),
  };
}

/**
 * Clear the active timer (for crash recovery/cleanup)
 */
export async function clearActiveTimer(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE active_timer
     SET client_id = NULL, session_id = NULL, start_time = NULL, is_running = 0
     WHERE id = 1`
  );
}

/**
 * Get active session (if any)
 */
export async function getActiveSession(): Promise<TimeSession | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<TimeSession>(
    `SELECT id, client_id, start_time, end_time, duration, date,
            CAST(is_active AS INTEGER) as is_active, notes, created_at
     FROM time_sessions
     WHERE is_active = 1
     LIMIT 1`
  );

  if (!result) return null;

  return {
    ...result,
    is_active: Boolean(result.is_active),
  };
}

/**
 * Get sessions for a client within a date range
 */
export async function getSessionsByDateRange(
  clientId: number,
  startDate: string,
  endDate: string
): Promise<TimeSession[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<TimeSession>(
    `SELECT id, client_id, start_time, end_time, duration, date,
            CAST(is_active AS INTEGER) as is_active, notes, created_at
     FROM time_sessions
     WHERE client_id = ?
       AND date >= ?
       AND date <= ?
       AND is_active = 0
     ORDER BY date DESC, start_time DESC`,
    [clientId, startDate, endDate]
  );

  return result.map((session) => ({
    ...session,
    is_active: Boolean(session.is_active),
  }));
}

/**
 * Get unbilled sessions for a client
 */
export async function getUnbilledSessions(
  clientId: number
): Promise<TimeSession[]> {
  const db = await getDatabase();

  // Get all completed sessions that haven't been included in an invoice
  const result = await db.getAllAsync<TimeSession>(
    `SELECT ts.id, ts.client_id, ts.start_time, ts.end_time, ts.duration, ts.date,
            CAST(ts.is_active AS INTEGER) as is_active, ts.notes, ts.created_at
     FROM time_sessions ts
     WHERE ts.client_id = ?
       AND ts.is_active = 0
       AND ts.end_time IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM invoices i
         WHERE i.client_id = ts.client_id
           AND (',' || i.session_ids || ',') LIKE ('%,' || ts.id || ',%')
       )
     ORDER BY ts.date DESC, ts.start_time DESC`,
    [clientId]
  );

  return result.map((session) => ({
    ...session,
    is_active: Boolean(session.is_active),
  }));
}

/**
 * Get total duration for a client
 */
export async function getTotalDurationForClient(
  clientId: number
): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(duration), 0) as total
     FROM time_sessions
     WHERE client_id = ?
       AND is_active = 0`,
    [clientId]
  );
  return result?.total ?? 0;
}

/**
 * Update a session (for editing time entries)
 */
export async function updateSession(
  sessionId: number,
  updates: {
    start_time?: string;
    end_time?: string;
    duration?: number;
    date?: string;
    notes?: string;
  }
): Promise<TimeSession> {
  const db = await getDatabase();

  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.start_time !== undefined) {
    setClauses.push('start_time = ?');
    values.push(updates.start_time);
  }
  if (updates.end_time !== undefined) {
    setClauses.push('end_time = ?');
    values.push(updates.end_time);
  }
  if (updates.duration !== undefined) {
    setClauses.push('duration = ?');
    values.push(updates.duration);
  }
  if (updates.date !== undefined) {
    setClauses.push('date = ?');
    values.push(updates.date);
  }
  if (updates.notes !== undefined) {
    setClauses.push('notes = ?');
    values.push(updates.notes);
  }

  if (setClauses.length === 0) {
    const session = await getSessionById(sessionId);
    if (!session) throw new Error('Session not found');
    return session;
  }

  values.push(sessionId);

  await db.runAsync(
    `UPDATE time_sessions SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );

  const updatedSession = await getSessionById(sessionId);
  if (!updatedSession) {
    throw new Error('Failed to update session');
  }

  return updatedSession;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM time_sessions WHERE id = ?', [sessionId]);
}

/**
 * Delete all completed sessions for a client (used after payment)
 */
export async function deleteAllSessionsForClient(clientId: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'DELETE FROM time_sessions WHERE client_id = ? AND is_active = 0',
    [clientId]
  );
  return result.changes;
}

/**
 * Create a manual time entry
 */
export async function createManualSession(
  clientId: number,
  durationSeconds: number,
  date?: string,
  notes?: string
): Promise<TimeSession> {
  const db = await getDatabase();
  const sessionDate = date || formatDateForDb(new Date());
  const now = new Date();

  // Create start and end times based on duration
  // Set end time to now, start time to now - duration
  const endTime = formatDateTimeForDb(now);
  const startTime = formatDateTimeForDb(new Date(now.getTime() - durationSeconds * 1000));

  const result = await db.runAsync(
    `INSERT INTO time_sessions (client_id, start_time, end_time, duration, date, is_active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [clientId, startTime, endTime, durationSeconds, sessionDate, notes || null, endTime]
  );

  const session = await getSessionById(result.lastInsertRowId);
  if (!session) {
    throw new Error('Failed to create manual session');
  }

  return session;
}

/**
 * Get sessions grouped by date
 */
export async function getSessionsGroupedByDate(
  clientId: number
): Promise<{ date: string; sessions: TimeSession[] }[]> {
  const sessions = await getSessionsByClientId(clientId);

  const grouped = sessions.reduce<Record<string, TimeSession[]>>(
    (acc, session) => {
      if (!acc[session.date]) {
        acc[session.date] = [];
      }
      acc[session.date].push(session);
      return acc;
    },
    {}
  );

  return Object.entries(grouped)
    .map(([date, sessions]) => ({ date, sessions }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
