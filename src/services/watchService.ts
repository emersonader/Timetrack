import { getDatabase } from '../db/database';

// --- Types ---

export interface WatchSyncData {
  timerState: {
    isRunning: boolean;
    clientId: number | null;
    clientName: string | null;
    startTime: string | null;
    elapsedSeconds: number;
  };
  recentClients: {
    id: number;
    name: string;
    hourlyRate: number;
  }[];
  todaySummary: {
    totalHours: number;
    totalEarnings: number;
    sessionCount: number;
  };
}

// --- Helpers ---

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

// --- Public API ---

/**
 * Full sync payload for the Apple Watch companion app.
 * Contains current timer state, recent client list, and today's summary.
 * Sent via WatchConnectivity when the watch requests an update.
 */
export async function getWatchSyncData(): Promise<WatchSyncData> {
  try {
    const db = await getDatabase();

    // --- Timer state ---
    const timer = await db.getFirstAsync<{
      is_running: number;
      start_time: string | null;
      client_id: number | null;
    }>('SELECT is_running, start_time, client_id FROM active_timer WHERE id = 1');

    let timerClientName: string | null = null;
    let elapsedSeconds = 0;

    if (timer?.is_running && timer.client_id) {
      const client = await db.getFirstAsync<{
        first_name: string;
        last_name: string;
      }>('SELECT first_name, last_name FROM clients WHERE id = ?', [timer.client_id]);
      if (client) {
        timerClientName = `${client.first_name} ${client.last_name}`.trim();
      }
    }

    if (timer?.is_running && timer.start_time) {
      const startTime = new Date(timer.start_time);
      const now = new Date();
      elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
    }

    // --- Recent clients ---
    const recentClientRows = await db.getAllAsync<{
      id: number;
      first_name: string;
      last_name: string;
      hourly_rate: number;
    }>(
      `SELECT c.id, c.first_name, c.last_name, c.hourly_rate
       FROM clients c
       JOIN time_sessions ts ON ts.client_id = c.id
       GROUP BY c.id
       ORDER BY MAX(ts.start_time) DESC
       LIMIT 5`
    );

    // --- Today summary ---
    const today = getTodayDateString();
    const todayResult = await db.getFirstAsync<{
      totalSeconds: number | null;
      totalEarnings: number | null;
      sessionCount: number;
    }>(
      `SELECT
         COALESCE(SUM(ts.duration), 0) AS totalSeconds,
         COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) AS totalEarnings,
         COUNT(ts.id) AS sessionCount
       FROM time_sessions ts
       JOIN clients c ON c.id = ts.client_id
       WHERE ts.date = ? AND ts.is_active = 0 AND ts.duration > 0`,
      [today]
    );

    return {
      timerState: {
        isRunning: !!(timer?.is_running),
        clientId: timer?.client_id ?? null,
        clientName: timerClientName,
        startTime: timer?.is_running ? (timer.start_time ?? null) : null,
        elapsedSeconds,
      },
      recentClients: recentClientRows.map((row) => ({
        id: row.id,
        name: `${row.first_name} ${row.last_name}`.trim(),
        hourlyRate: row.hourly_rate,
      })),
      todaySummary: {
        totalHours: (todayResult?.totalSeconds ?? 0) / 3600,
        totalEarnings: Math.round((todayResult?.totalEarnings ?? 0) * 100) / 100,
        sessionCount: todayResult?.sessionCount ?? 0,
      },
    };
  } catch (error) {
    console.error('watchService: getWatchSyncData failed:', error);
    return {
      timerState: {
        isRunning: false,
        clientId: null,
        clientName: null,
        startTime: null,
        elapsedSeconds: 0,
      },
      recentClients: [],
      todaySummary: {
        totalHours: 0,
        totalEarnings: 0,
        sessionCount: 0,
      },
    };
  }
}

/**
 * Minimal data for an Apple Watch face complication.
 * Returns pre-formatted strings suitable for small display areas.
 */
export async function getComplicationData(): Promise<{
  isRunning: boolean;
  elapsed: string;
  todayHours: string;
}> {
  try {
    const db = await getDatabase();

    // Timer state
    const timer = await db.getFirstAsync<{
      is_running: number;
      start_time: string | null;
    }>('SELECT is_running, start_time FROM active_timer WHERE id = 1');

    let elapsedSeconds = 0;
    const isRunning = !!(timer?.is_running);

    if (isRunning && timer?.start_time) {
      const startTime = new Date(timer.start_time);
      const now = new Date();
      elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
    }

    // Today total
    const today = getTodayDateString();
    const todayResult = await db.getFirstAsync<{ totalSeconds: number | null }>(
      `SELECT COALESCE(SUM(duration), 0) AS totalSeconds
       FROM time_sessions
       WHERE date = ? AND is_active = 0 AND duration > 0`,
      [today]
    );

    return {
      isRunning,
      elapsed: formatDuration(elapsedSeconds),
      todayHours: formatDuration(todayResult?.totalSeconds ?? 0),
    };
  } catch (error) {
    console.error('watchService: getComplicationData failed:', error);
    return { isRunning: false, elapsed: '0m', todayHours: '0m' };
  }
}

/**
 * Client list for Apple Watch Digital Crown selection.
 * Returns a compact list sorted by most recently used, suitable for
 * the watch's scrollable picker interface.
 */
export async function getClientListForWatch(limit: number = 10): Promise<{
  id: number;
  name: string;
  rate: number;
}[]> {
  try {
    const db = await getDatabase();

    const rows = await db.getAllAsync<{
      id: number;
      first_name: string;
      last_name: string;
      hourly_rate: number;
    }>(
      `SELECT c.id, c.first_name, c.last_name, c.hourly_rate
       FROM clients c
       LEFT JOIN time_sessions ts ON ts.client_id = c.id
       GROUP BY c.id
       ORDER BY MAX(ts.start_time) DESC, c.first_name ASC
       LIMIT ?`,
      [limit]
    );

    return rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      rate: row.hourly_rate,
    }));
  } catch (error) {
    console.error('watchService: getClientListForWatch failed:', error);
    return [];
  }
}
