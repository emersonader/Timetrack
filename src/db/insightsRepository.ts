import { getDatabase } from './database';
import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

// --- Types ---

export interface ClientInsight {
  clientId: number;
  clientName: string;
  totalHours: number;
  totalEarnings: number;
  materialCost: number;
  netProfit: number;
  effectiveRate: number;
  sessionCount: number;
  avgSessionDuration: number; // seconds
}

export interface EstimationAccuracy {
  templateTitle: string;
  estimatedSeconds: number;
  avgActualSeconds: number;
  sessionCount: number;
  accuracy: number; // percentage (100 = perfect match)
}

export interface SchedulingSuggestion {
  dayOfWeek: number; // 0-6
  hourOfDay: number; // 0-23
  avgProductivity: number; // earnings per hour
  sessionCount: number;
}

export interface MaterialCostTrend {
  month: string; // YYYY-MM
  totalCost: number;
  itemCount: number;
}

export interface SeasonalPattern {
  month: number; // 1-12
  avgHours: number;
  avgEarnings: number;
  dataPoints: number; // how many of that month we have data for
}

export interface CashFlowProjection {
  month: string; // YYYY-MM
  projectedEarnings: number;
  isHistorical: boolean;
}

export interface TopJobType {
  tag: string;
  totalHours: number;
  totalEarnings: number;
  sessionCount: number;
}

/**
 * Get most profitable clients ranked by net profit with deeper stats
 */
export async function getClientInsights(): Promise<ClientInsight[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    clientId: number;
    clientName: string;
    totalHours: number;
    totalEarnings: number;
    materialCost: number;
    sessionCount: number;
    avgSessionDuration: number;
  }>(
    `SELECT
       c.id as clientId,
       c.first_name || ' ' || c.last_name as clientName,
       COALESCE(SUM(ts.duration) / 3600.0, 0) as totalHours,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings,
       COALESCE((SELECT SUM(m.cost) FROM materials m WHERE m.client_id = c.id), 0) as materialCost,
       COUNT(ts.id) as sessionCount,
       COALESCE(AVG(ts.duration), 0) as avgSessionDuration
     FROM clients c
     LEFT JOIN time_sessions ts ON ts.client_id = c.id AND ts.is_active = 0 AND ts.duration > 0
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
 * Get top job types by tag with earnings
 */
export async function getTopJobTypes(): Promise<TopJobType[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    tag: string;
    totalHours: number;
    totalEarnings: number;
    sessionCount: number;
  }>(
    `SELECT
       t.name as tag,
       COALESCE(SUM(ts.duration) / 3600.0, 0) as totalHours,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings,
       COUNT(ts.id) as sessionCount
     FROM tags t
     JOIN session_tags st ON st.tag_id = t.id
     JOIN time_sessions ts ON ts.id = st.session_id AND ts.is_active = 0 AND ts.duration > 0
     JOIN clients c ON c.id = ts.client_id
     GROUP BY t.id
     HAVING sessionCount > 0
     ORDER BY totalEarnings DESC
     LIMIT 10`
  );

  return rows;
}

/**
 * Compare template estimated durations with actual session durations.
 * Matches sessions that have notes starting with the template title.
 */
export async function getEstimationAccuracy(): Promise<EstimationAccuracy[]> {
  const db = await getDatabase();

  // Get all templates
  const templates = await db.getAllAsync<{
    id: number;
    title: string;
    estimated_duration_seconds: number;
  }>(
    `SELECT id, title, estimated_duration_seconds FROM project_templates`
  );

  const results: EstimationAccuracy[] = [];

  for (const template of templates) {
    // Find sessions whose notes contain the template title (applied from template)
    const stats = await db.getFirstAsync<{
      avgActual: number | null;
      cnt: number;
    }>(
      `SELECT AVG(ts.duration) as avgActual, COUNT(*) as cnt
       FROM time_sessions ts
       WHERE ts.is_active = 0 AND ts.duration > 0
         AND ts.notes LIKE ?`,
      [`%${template.title}%`]
    );

    if (stats && stats.cnt > 0 && stats.avgActual) {
      const ratio = stats.avgActual / template.estimated_duration_seconds;
      // Accuracy: 100 - abs deviation percentage, capped at 0
      const accuracy = Math.max(0, 100 - Math.abs((ratio - 1) * 100));

      results.push({
        templateTitle: template.title,
        estimatedSeconds: template.estimated_duration_seconds,
        avgActualSeconds: Math.round(stats.avgActual),
        sessionCount: stats.cnt,
        accuracy: Math.round(accuracy),
      });
    }
  }

  return results.sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * Analyze productivity by day-of-week and hour-of-day
 * to suggest optimal scheduling
 */
export async function getSchedulingSuggestions(): Promise<SchedulingSuggestion[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    dayOfWeek: number;
    hourOfDay: number;
    totalEarnings: number;
    totalHours: number;
    sessionCount: number;
  }>(
    `SELECT
       CAST(strftime('%w', ts.date) AS INTEGER) as dayOfWeek,
       CAST(strftime('%H', ts.start_time) AS INTEGER) as hourOfDay,
       COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings,
       COALESCE(SUM(ts.duration) / 3600.0, 0) as totalHours,
       COUNT(ts.id) as sessionCount
     FROM time_sessions ts
     JOIN clients c ON c.id = ts.client_id
     WHERE ts.is_active = 0 AND ts.duration > 0
     GROUP BY dayOfWeek, hourOfDay
     HAVING sessionCount >= 2
     ORDER BY (totalEarnings / CASE WHEN totalHours > 0 THEN totalHours ELSE 1 END) DESC
     LIMIT 10`
  );

  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    hourOfDay: r.hourOfDay,
    avgProductivity: r.totalHours > 0 ? r.totalEarnings / r.totalHours : 0,
    sessionCount: r.sessionCount,
  }));
}

/**
 * Get material cost trend per month for the last 12 months
 */
export async function getMaterialCostTrend(): Promise<MaterialCostTrend[]> {
  const db = await getDatabase();
  const results: MaterialCostTrend[] = [];

  for (let i = 11; i >= 0; i--) {
    const targetDate = subMonths(new Date(), i);
    const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');
    const monthLabel = format(targetDate, 'yyyy-MM');

    const row = await db.getFirstAsync<{
      totalCost: number | null;
      itemCount: number;
    }>(
      `SELECT
         COALESCE(SUM(m.cost), 0) as totalCost,
         COUNT(m.id) as itemCount
       FROM materials m
       WHERE m.created_at >= ? AND m.created_at < ?`,
      [monthStart + 'T00:00:00', monthEnd + 'T23:59:59']
    );

    results.push({
      month: monthLabel,
      totalCost: row?.totalCost ?? 0,
      itemCount: row?.itemCount ?? 0,
    });
  }

  return results;
}

/**
 * Detect seasonal work patterns by analyzing average hours/earnings per calendar month
 */
export async function getSeasonalPatterns(): Promise<SeasonalPattern[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    monthNum: number;
    avgHours: number;
    avgEarnings: number;
    dataPoints: number;
  }>(
    `SELECT
       CAST(strftime('%m', ts.date) AS INTEGER) as monthNum,
       AVG(monthly_totals.monthly_hours) as avgHours,
       AVG(monthly_totals.monthly_earnings) as avgEarnings,
       COUNT(DISTINCT monthly_totals.year_month) as dataPoints
     FROM (
       SELECT
         strftime('%m', ts2.date) as month_num,
         strftime('%Y-%m', ts2.date) as year_month,
         SUM(ts2.duration) / 3600.0 as monthly_hours,
         SUM(ts2.duration * c2.hourly_rate / 3600.0) as monthly_earnings
       FROM time_sessions ts2
       JOIN clients c2 ON c2.id = ts2.client_id
       WHERE ts2.is_active = 0 AND ts2.duration > 0
       GROUP BY year_month
     ) as monthly_totals
     JOIN time_sessions ts ON 1=1
     WHERE CAST(strftime('%m', ts.date) AS INTEGER) = CAST(monthly_totals.month_num AS INTEGER)
     GROUP BY monthNum
     ORDER BY monthNum`
  );

  // If the subquery approach doesn't work in SQLite, use a simpler method
  if (rows.length === 0) {
    return getSeasonalPatternsSimple();
  }

  return rows.map((r) => ({
    month: r.monthNum,
    avgHours: r.avgHours,
    avgEarnings: r.avgEarnings,
    dataPoints: r.dataPoints,
  }));
}

/**
 * Simpler seasonal pattern detection fallback
 */
async function getSeasonalPatternsSimple(): Promise<SeasonalPattern[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    monthNum: number;
    totalHours: number;
    totalEarnings: number;
    monthCount: number;
  }>(
    `SELECT
       CAST(strftime('%m', ts.date) AS INTEGER) as monthNum,
       SUM(ts.duration) / 3600.0 as totalHours,
       SUM(ts.duration * c.hourly_rate / 3600.0) as totalEarnings,
       COUNT(DISTINCT strftime('%Y-%m', ts.date)) as monthCount
     FROM time_sessions ts
     JOIN clients c ON c.id = ts.client_id
     WHERE ts.is_active = 0 AND ts.duration > 0
     GROUP BY monthNum
     ORDER BY monthNum`
  );

  return rows.map((r) => ({
    month: r.monthNum,
    avgHours: r.monthCount > 0 ? r.totalHours / r.monthCount : 0,
    avgEarnings: r.monthCount > 0 ? r.totalEarnings / r.monthCount : 0,
    dataPoints: r.monthCount,
  }));
}

/**
 * Project cash flow for next 3 months based on trailing 3-month average
 */
export async function getCashFlowProjection(): Promise<CashFlowProjection[]> {
  const db = await getDatabase();
  const results: CashFlowProjection[] = [];

  // Get last 6 months of actual earnings
  for (let i = 5; i >= 0; i--) {
    const targetDate = subMonths(new Date(), i);
    const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');
    const monthLabel = format(targetDate, 'yyyy-MM');

    const row = await db.getFirstAsync<{ totalEarnings: number | null }>(
      `SELECT COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as totalEarnings
       FROM time_sessions ts
       JOIN clients c ON ts.client_id = c.id
       WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0`,
      [monthStart, monthEnd]
    );

    results.push({
      month: monthLabel,
      projectedEarnings: row?.totalEarnings ?? 0,
      isHistorical: true,
    });
  }

  // Calculate trailing 3-month average for projection
  const lastThreeMonths = results.slice(-3);
  const avgEarnings = lastThreeMonths.reduce((sum, m) => sum + m.projectedEarnings, 0) / 3;

  // Project next 3 months
  for (let i = 1; i <= 3; i++) {
    const targetDate = subMonths(new Date(), -i);
    const monthLabel = format(targetDate, 'yyyy-MM');

    // Apply slight seasonal adjustment if we have seasonal data
    results.push({
      month: monthLabel,
      projectedEarnings: Math.round(avgEarnings * 100) / 100,
      isHistorical: false,
    });
  }

  return results;
}

/**
 * Get recent weekly earnings to compute trend direction
 */
export async function getWeeklyEarningsTrend(): Promise<{ current: number; previous: number; percentChange: number }> {
  const db = await getDatabase();
  const now = new Date();

  const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const currentWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const prevWeekDate = subWeeks(now, 1);
  const prevWeekStart = format(startOfWeek(prevWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const prevWeekEnd = format(endOfWeek(prevWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const currentRow = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as total
     FROM time_sessions ts JOIN clients c ON c.id = ts.client_id
     WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0`,
    [currentWeekStart, currentWeekEnd]
  );

  const prevRow = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(ts.duration * c.hourly_rate / 3600.0), 0) as total
     FROM time_sessions ts JOIN clients c ON c.id = ts.client_id
     WHERE ts.date >= ? AND ts.date <= ? AND ts.is_active = 0`,
    [prevWeekStart, prevWeekEnd]
  );

  const current = currentRow?.total ?? 0;
  const previous = prevRow?.total ?? 0;
  const percentChange = previous > 0
    ? Math.round(((current - previous) / previous) * 100)
    : current > 0 ? 100 : 0;

  return { current, previous, percentChange };
}
