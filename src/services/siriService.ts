import { getDatabase } from '../db/database';

// --- Types ---

export interface SiriShortcut {
  identifier: string;
  title: string;
  phrase: string;
  description: string;
}

// --- Available Shortcuts ---

export const AVAILABLE_SHORTCUTS: SiriShortcut[] = [
  {
    identifier: 'com.jobtimetracker.start-timer',
    title: 'Start Timer',
    phrase: 'Start timer for',
    description: 'Start tracking time for a client',
  },
  {
    identifier: 'com.jobtimetracker.stop-timer',
    title: 'Stop Timer',
    phrase: 'Stop my timer',
    description: 'Stop the currently running timer',
  },
  {
    identifier: 'com.jobtimetracker.today-summary',
    title: "Today's Summary",
    phrase: 'How long have I worked today',
    description: "Get a summary of today's work",
  },
];

// --- Helper ---

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- Data Functions ---

/**
 * Get a summary of today's work for the "Today's Summary" Siri shortcut.
 * Queries completed time_sessions for today, sums duration, counts distinct
 * clients, and calculates total earnings based on each client's hourly rate.
 */
export async function getTodaySummary(): Promise<{
  totalSeconds: number;
  clientCount: number;
  totalEarnings: number;
}> {
  try {
    const db = await getDatabase();
    const today = getTodayDateString();

    const result = await db.getFirstAsync<{
      totalSeconds: number | null;
      clientCount: number;
      totalEarnings: number | null;
    }>(
      `SELECT
         COALESCE(SUM(ts.duration), 0) AS totalSeconds,
         COUNT(DISTINCT ts.client_id) AS clientCount,
         COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) AS totalEarnings
       FROM time_sessions ts
       JOIN clients c ON c.id = ts.client_id
       WHERE ts.date = ? AND ts.is_active = 0 AND ts.duration > 0`,
      [today]
    );

    return {
      totalSeconds: result?.totalSeconds ?? 0,
      clientCount: result?.clientCount ?? 0,
      totalEarnings: Math.round((result?.totalEarnings ?? 0) * 100) / 100,
    };
  } catch (error) {
    console.error('siriService: getTodaySummary failed:', error);
    return { totalSeconds: 0, clientCount: 0, totalEarnings: 0 };
  }
}

/**
 * Get the most recently timed clients for shortcut suggestions.
 * Ordered by the latest session start_time descending.
 */
export async function getRecentClients(limit: number = 5): Promise<{
  id: number;
  name: string;
  lastUsed: string;
}[]> {
  try {
    const db = await getDatabase();

    const rows = await db.getAllAsync<{
      id: number;
      first_name: string;
      last_name: string;
      lastUsed: string;
    }>(
      `SELECT c.id, c.first_name, c.last_name, MAX(ts.start_time) AS lastUsed
       FROM clients c
       JOIN time_sessions ts ON ts.client_id = c.id
       GROUP BY c.id
       ORDER BY lastUsed DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      lastUsed: row.lastUsed,
    }));
  } catch (error) {
    console.error('siriService: getRecentClients failed:', error);
    return [];
  }
}

/**
 * Get information about the currently running timer, if any.
 * Reads the active_timer singleton row and joins with clients for the name.
 */
export async function getActiveTimerInfo(): Promise<{
  isRunning: boolean;
  clientName: string | null;
  elapsedSeconds: number;
} | null> {
  try {
    const db = await getDatabase();

    const timer = await db.getFirstAsync<{
      is_running: number;
      start_time: string | null;
      client_id: number | null;
    }>('SELECT is_running, start_time, client_id FROM active_timer WHERE id = 1');

    if (!timer || !timer.is_running) {
      return { isRunning: false, clientName: null, elapsedSeconds: 0 };
    }

    let clientName: string | null = null;
    if (timer.client_id) {
      const client = await db.getFirstAsync<{
        first_name: string;
        last_name: string;
      }>('SELECT first_name, last_name FROM clients WHERE id = ?', [timer.client_id]);

      if (client) {
        clientName = `${client.first_name} ${client.last_name}`.trim();
      }
    }

    let elapsedSeconds = 0;
    if (timer.start_time) {
      const startTime = new Date(timer.start_time);
      const now = new Date();
      elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
    }

    return { isRunning: true, clientName, elapsedSeconds };
  } catch (error) {
    console.error('siriService: getActiveTimerInfo failed:', error);
    return null;
  }
}
