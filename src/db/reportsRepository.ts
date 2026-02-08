import { getDatabase } from './database';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subWeeks } from 'date-fns';

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  totalEarnings: number;
}

export interface ClientBreakdown {
  clientId: number;
  clientName: string;
  currency: string;
  totalSeconds: number;
  totalEarnings: number;
}

/**
 * Get daily stats for the current week (Mon-Sun).
 * Missing days are filled with zero values.
 */
export async function getWeeklyDailyStats(): Promise<DailyStats[]> {
  const db = await getDatabase();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const rows = await db.getAllAsync<{
    date: string;
    totalSeconds: number;
    totalEarnings: number;
  }>(
    `SELECT
       ts.date,
       COALESCE(SUM(ts.duration), 0) as totalSeconds,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
     FROM time_sessions ts
     JOIN clients c ON ts.client_id = c.id
     WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0
     GROUP BY ts.date
     ORDER BY ts.date`,
    [weekStartStr, weekEndStr]
  );

  // Build a map for quick lookup
  const dataMap = new Map<string, { totalSeconds: number; totalEarnings: number }>();
  for (const row of rows) {
    dataMap.set(row.date, { totalSeconds: row.totalSeconds, totalEarnings: row.totalEarnings });
  }

  // Fill in all days of the week
  const allDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  return allDays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const data = dataMap.get(dateStr);
    return {
      date: dateStr,
      totalSeconds: data?.totalSeconds ?? 0,
      totalEarnings: data?.totalEarnings ?? 0,
    };
  });
}

/**
 * Get daily stats for the current month.
 * Missing days are filled with zero values.
 */
export async function getMonthlyDailyStats(): Promise<DailyStats[]> {
  const db = await getDatabase();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const rows = await db.getAllAsync<{
    date: string;
    totalSeconds: number;
    totalEarnings: number;
  }>(
    `SELECT
       ts.date,
       COALESCE(SUM(ts.duration), 0) as totalSeconds,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
     FROM time_sessions ts
     JOIN clients c ON ts.client_id = c.id
     WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0
     GROUP BY ts.date
     ORDER BY ts.date`,
    [monthStartStr, monthEndStr]
  );

  const dataMap = new Map<string, { totalSeconds: number; totalEarnings: number }>();
  for (const row of rows) {
    dataMap.set(row.date, { totalSeconds: row.totalSeconds, totalEarnings: row.totalEarnings });
  }

  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  return allDays.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const data = dataMap.get(dateStr);
    return {
      date: dateStr,
      totalSeconds: data?.totalSeconds ?? 0,
      totalEarnings: data?.totalEarnings ?? 0,
    };
  });
}

/**
 * Get client breakdown for the current week.
 */
export async function getWeeklyClientBreakdown(): Promise<ClientBreakdown[]> {
  const db = await getDatabase();
  const now = new Date();
  const weekStartStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return db.getAllAsync<ClientBreakdown>(
    `SELECT
       c.id as clientId,
       c.first_name || ' ' || c.last_name as clientName,
       COALESCE(c.currency, 'USD') as currency,
       COALESCE(SUM(ts.duration), 0) as totalSeconds,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
     FROM time_sessions ts
     JOIN clients c ON ts.client_id = c.id
     WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0
     GROUP BY c.id
     ORDER BY totalSeconds DESC`,
    [weekStartStr, weekEndStr]
  );
}

/**
 * Get client breakdown for the current month.
 */
export async function getMonthlyClientBreakdown(): Promise<ClientBreakdown[]> {
  const db = await getDatabase();
  const now = new Date();
  const monthStartStr = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEndStr = format(endOfMonth(now), 'yyyy-MM-dd');

  return db.getAllAsync<ClientBreakdown>(
    `SELECT
       c.id as clientId,
       c.first_name || ' ' || c.last_name as clientName,
       COALESCE(c.currency, 'USD') as currency,
       COALESCE(SUM(ts.duration), 0) as totalSeconds,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
     FROM time_sessions ts
     JOIN clients c ON ts.client_id = c.id
     WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0
     GROUP BY c.id
     ORDER BY totalSeconds DESC`,
    [monthStartStr, monthEndStr]
  );
}

/**
 * Get weekly totals for the last N weeks (for trend comparison).
 */
export async function getWeeklyTotals(
  numWeeks: number
): Promise<{ weekStart: string; totalSeconds: number; totalEarnings: number }[]> {
  const db = await getDatabase();
  const results: { weekStart: string; totalSeconds: number; totalEarnings: number }[] = [];

  for (let i = 0; i < numWeeks; i++) {
    const now = new Date();
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

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
      [weekStartStr, weekEndStr]
    );

    results.push({
      weekStart: weekStartStr,
      totalSeconds: row?.totalSeconds ?? 0,
      totalEarnings: row?.totalEarnings ?? 0,
    });
  }

  return results.reverse();
}
