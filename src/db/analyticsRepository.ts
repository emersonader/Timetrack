import { getDatabase } from './database';
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export interface ClientProfitability {
  clientId: number;
  clientName: string;
  totalHours: number;
  totalEarnings: number;
  materialCost: number;
  netProfit: number;
  effectiveRate: number;
}

export interface AverageSessionStats {
  avgDurationSeconds: number;
  totalSessions: number;
}

export interface DayOfWeekStats {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  totalSeconds: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  totalSeconds: number;
  totalEarnings: number;
}

/**
 * Get client profitability: earnings minus material costs per client
 */
export async function getClientProfitability(): Promise<ClientProfitability[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    clientId: number;
    clientName: string;
    totalHours: number;
    totalEarnings: number;
    materialCost: number;
  }>(
    `SELECT
       c.id as clientId,
       c.first_name || ' ' || c.last_name as clientName,
       COALESCE(SUM(ts.duration) / 3600.0, 0) as totalHours,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings,
       COALESCE((SELECT SUM(m.cost) FROM materials m WHERE m.client_id = c.id), 0) as materialCost
     FROM clients c
     LEFT JOIN time_sessions ts ON ts.client_id = c.id AND ts.is_active = 0
     GROUP BY c.id
     HAVING totalHours > 0
     ORDER BY totalEarnings DESC`
  );

  return rows.map((row) => ({
    ...row,
    netProfit: row.totalEarnings,
    effectiveRate: row.totalHours > 0
      ? row.totalEarnings / row.totalHours
      : 0,
  }));
}

/**
 * Get average session duration and total session count
 */
export async function getAverageSessionStats(): Promise<AverageSessionStats> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{
    avgDuration: number | null;
    totalSessions: number;
  }>(
    `SELECT
       AVG(duration) as avgDuration,
       COUNT(*) as totalSessions
     FROM time_sessions
     WHERE is_active = 0 AND duration > 0`
  );

  return {
    avgDurationSeconds: Math.round(row?.avgDuration ?? 0),
    totalSessions: row?.totalSessions ?? 0,
  };
}

/**
 * Get total seconds worked per day of week (0=Sunday...6=Saturday)
 */
export async function getBusiestDayOfWeek(): Promise<DayOfWeekStats[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    dayOfWeek: number;
    totalSeconds: number;
  }>(
    `SELECT
       CAST(strftime('%w', date) AS INTEGER) as dayOfWeek,
       COALESCE(SUM(duration), 0) as totalSeconds
     FROM time_sessions
     WHERE is_active = 0
     GROUP BY dayOfWeek
     ORDER BY dayOfWeek`
  );

  // Fill in all 7 days
  const map = new Map(rows.map((r) => [r.dayOfWeek, r.totalSeconds]));
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    totalSeconds: map.get(i) ?? 0,
  }));
}

/**
 * Get monthly trend for the last N months
 */
export async function getMonthlyTrend(numMonths: number = 6): Promise<MonthlyTrend[]> {
  const db = await getDatabase();
  const results: MonthlyTrend[] = [];

  for (let i = numMonths - 1; i >= 0; i--) {
    const targetDate = subMonths(new Date(), i);
    const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');
    const monthLabel = format(targetDate, 'yyyy-MM');

    const row = await db.getFirstAsync<{
      totalSeconds: number | null;
      totalEarnings: number | null;
    }>(
      `SELECT
         COALESCE(SUM(ts.duration), 0) as totalSeconds,
         COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
       FROM time_sessions ts
       JOIN clients c ON ts.client_id = c.id
       WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0`,
      [monthStart, monthEnd]
    );

    results.push({
      month: monthLabel,
      totalSeconds: row?.totalSeconds ?? 0,
      totalEarnings: row?.totalEarnings ?? 0,
    });
  }

  return results;
}

/**
 * Get current week hours total
 */
export async function getCurrentWeekHours(): Promise<number> {
  const db = await getDatabase();
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const row = await db.getFirstAsync<{ totalSeconds: number | null }>(
    `SELECT COALESCE(SUM(duration), 0) as totalSeconds
     FROM time_sessions
     WHERE date >= ? AND date <= ? AND is_active = 0`,
    [weekStart, weekEnd]
  );

  return (row?.totalSeconds ?? 0) / 3600;
}

/**
 * Get weekly hours goal from user settings
 */
export async function getWeeklyGoal(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ weekly_hours_goal: number | null }>(
    'SELECT weekly_hours_goal FROM user_settings WHERE id = 1'
  );
  return row?.weekly_hours_goal ?? 0;
}

/**
 * Set weekly hours goal
 */
export async function setWeeklyGoal(hours: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE user_settings SET weekly_hours_goal = ? WHERE id = 1',
    [hours]
  );
}
