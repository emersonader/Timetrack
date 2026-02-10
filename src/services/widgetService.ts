import { getDatabase } from '../db/database';

// --- Types ---

export interface WidgetData {
  timerRunning: boolean;
  currentClientName: string | null;
  elapsedSeconds: number;
  todayHours: number;
  todayEarnings: number;
  weekHours: number;
  recentClients: { id: number; name: string }[];
  lastUpdated: string;
}

// --- Helpers ---

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStartDateString(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - dayOfWeek;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
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

async function getTimerState(db: Awaited<ReturnType<typeof getDatabase>>): Promise<{
  isRunning: boolean;
  clientName: string | null;
  elapsedSeconds: number;
}> {
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
}

async function getTodayTotals(db: Awaited<ReturnType<typeof getDatabase>>): Promise<{
  totalSeconds: number;
  totalEarnings: number;
}> {
  const today = getTodayDateString();
  const result = await db.getFirstAsync<{
    totalSeconds: number | null;
    totalEarnings: number | null;
  }>(
    `SELECT
       COALESCE(SUM(ts.duration), 0) AS totalSeconds,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) AS totalEarnings
     FROM time_sessions ts
     JOIN clients c ON c.id = ts.client_id
     WHERE ts.date = ? AND ts.is_active = 0 AND ts.duration > 0`,
    [today]
  );

  return {
    totalSeconds: result?.totalSeconds ?? 0,
    totalEarnings: Math.round((result?.totalEarnings ?? 0) * 100) / 100,
  };
}

async function getWeekTotalSeconds(db: Awaited<ReturnType<typeof getDatabase>>): Promise<number> {
  const weekStart = getWeekStartDateString();
  const today = getTodayDateString();
  const result = await db.getFirstAsync<{ totalSeconds: number | null }>(
    `SELECT COALESCE(SUM(duration), 0) AS totalSeconds
     FROM time_sessions
     WHERE date >= ? AND date <= ? AND is_active = 0 AND duration > 0`,
    [weekStart, today]
  );
  return result?.totalSeconds ?? 0;
}

async function getRecentClientList(
  db: Awaited<ReturnType<typeof getDatabase>>,
  limit: number
): Promise<{ id: number; name: string }[]> {
  const rows = await db.getAllAsync<{
    id: number;
    first_name: string;
    last_name: string;
  }>(
    `SELECT c.id, c.first_name, c.last_name
     FROM clients c
     JOIN time_sessions ts ON ts.client_id = c.id
     GROUP BY c.id
     ORDER BY MAX(ts.start_time) DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
  }));
}

// --- Public API ---

/**
 * Aggregate all data an iOS widget would need.
 * Includes active timer status, today/week totals, and recent clients.
 */
export async function getWidgetData(): Promise<WidgetData> {
  try {
    const db = await getDatabase();

    const [timerState, todayTotals, weekTotalSeconds, recentClients] = await Promise.all([
      getTimerState(db),
      getTodayTotals(db),
      getWeekTotalSeconds(db),
      getRecentClientList(db, 3),
    ]);

    return {
      timerRunning: timerState.isRunning,
      currentClientName: timerState.clientName,
      elapsedSeconds: timerState.elapsedSeconds,
      todayHours: todayTotals.totalSeconds / 3600,
      todayEarnings: todayTotals.totalEarnings,
      weekHours: weekTotalSeconds / 3600,
      recentClients,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('widgetService: getWidgetData failed:', error);
    return {
      timerRunning: false,
      currentClientName: null,
      elapsedSeconds: 0,
      todayHours: 0,
      todayEarnings: 0,
      weekHours: 0,
      recentClients: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Minimal data for a small iOS home-screen widget.
 * Returns pre-formatted duration strings.
 */
export async function getSmallWidgetData(): Promise<{
  timerRunning: boolean;
  clientName: string | null;
  elapsed: string;
  todayTotal: string;
}> {
  try {
    const db = await getDatabase();

    const [timerState, todayTotals] = await Promise.all([
      getTimerState(db),
      getTodayTotals(db),
    ]);

    return {
      timerRunning: timerState.isRunning,
      clientName: timerState.clientName,
      elapsed: formatDuration(timerState.elapsedSeconds),
      todayTotal: formatDuration(todayTotals.totalSeconds),
    };
  } catch (error) {
    console.error('widgetService: getSmallWidgetData failed:', error);
    return {
      timerRunning: false,
      clientName: null,
      elapsed: '0m',
      todayTotal: '0m',
    };
  }
}

/**
 * Data for a medium iOS widget with quick-start buttons.
 * Includes earnings and a short list of clients for one-tap timer start.
 */
export async function getMediumWidgetData(): Promise<{
  timerRunning: boolean;
  clientName: string | null;
  elapsed: string;
  todayTotal: string;
  todayEarnings: number;
  quickStartClients: { id: number; name: string }[];
}> {
  try {
    const db = await getDatabase();

    const [timerState, todayTotals, quickStartClients] = await Promise.all([
      getTimerState(db),
      getTodayTotals(db),
      getRecentClientList(db, 3),
    ]);

    return {
      timerRunning: timerState.isRunning,
      clientName: timerState.clientName,
      elapsed: formatDuration(timerState.elapsedSeconds),
      todayTotal: formatDuration(todayTotals.totalSeconds),
      todayEarnings: todayTotals.totalEarnings,
      quickStartClients,
    };
  } catch (error) {
    console.error('widgetService: getMediumWidgetData failed:', error);
    return {
      timerRunning: false,
      clientName: null,
      elapsed: '0m',
      todayTotal: '0m',
      todayEarnings: 0,
      quickStartClients: [],
    };
  }
}
