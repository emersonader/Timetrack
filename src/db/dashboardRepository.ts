import { getDatabase } from './database';
import { formatDateForDb } from '../utils/formatters';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface DashboardStats {
  totalSeconds: number;
  totalEarnings: number;
}

/**
 * Get total hours and earnings for today (across ALL clients).
 * Only counts completed (non-active) sessions.
 */
export async function getTodayStats(): Promise<DashboardStats> {
  const db = await getDatabase();
  const today = formatDateForDb(new Date());

  const result = await db.getFirstAsync<{
    totalSeconds: number | null;
    totalEarnings: number | null;
  }>(
    `SELECT
       COALESCE(SUM(ts.duration), 0) as totalSeconds,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
     FROM time_sessions ts
     JOIN clients c ON ts.client_id = c.id
     WHERE ts.date = ? AND ts.is_active = 0`,
    [today]
  );

  return {
    totalSeconds: result?.totalSeconds ?? 0,
    totalEarnings: result?.totalEarnings ?? 0,
  };
}

/**
 * Get total hours and earnings for this week (Monday–Sunday).
 * Only counts completed (non-active) sessions.
 */
export async function getWeekStats(): Promise<DashboardStats> {
  const db = await getDatabase();
  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const result = await db.getFirstAsync<{
    totalSeconds: number | null;
    totalEarnings: number | null;
  }>(
    `SELECT
       COALESCE(SUM(ts.duration), 0) as totalSeconds,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
     FROM time_sessions ts
     JOIN clients c ON ts.client_id = c.id
     WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0`,
    [weekStart, weekEnd]
  );

  return {
    totalSeconds: result?.totalSeconds ?? 0,
    totalEarnings: result?.totalEarnings ?? 0,
  };
}
