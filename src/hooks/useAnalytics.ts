import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getWeeklyTotals } from '../db/reportsRepository';
import {
  getClientProfitability,
  getAverageSessionStats,
  getBusiestDayOfWeek,
  getMonthlyTrend,
  getCurrentWeekHours,
  getWeeklyGoal,
  setWeeklyGoal as setWeeklyGoalDb,
  ClientProfitability,
  AverageSessionStats,
  DayOfWeekStats,
  MonthlyTrend,
} from '../db/analyticsRepository';

interface WeeklyTrendItem {
  weekStart: string;
  totalSeconds: number;
  totalEarnings: number;
}

interface UseAnalyticsResult {
  weeklyTrend: WeeklyTrendItem[];
  monthlyTrend: MonthlyTrend[];
  clientProfitability: ClientProfitability[];
  avgSessionStats: AverageSessionStats;
  busiestDays: DayOfWeekStats[];
  weeklyGoal: number;
  currentWeekHours: number;
  isLoading: boolean;
  setWeeklyGoal: (hours: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAnalytics(): UseAnalyticsResult {
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendItem[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [clientProfitability, setClientProfitability] = useState<ClientProfitability[]>([]);
  const [avgSessionStats, setAvgSessionStats] = useState<AverageSessionStats>({
    avgDurationSeconds: 0,
    totalSessions: 0,
  });
  const [busiestDays, setBusiestDays] = useState<DayOfWeekStats[]>([]);
  const [weeklyGoal, setWeeklyGoalState] = useState(0);
  const [currentWeekHours, setCurrentWeekHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [wt, mt, cp, ass, bd, wg, cwh] = await Promise.all([
        getWeeklyTotals(8),
        getMonthlyTrend(6),
        getClientProfitability(),
        getAverageSessionStats(),
        getBusiestDayOfWeek(),
        getWeeklyGoal(),
        getCurrentWeekHours(),
      ]);
      setWeeklyTrend(wt);
      setMonthlyTrend(mt);
      setClientProfitability(cp);
      setAvgSessionStats(ass);
      setBusiestDays(bd);
      setWeeklyGoalState(wg);
      setCurrentWeekHours(cwh);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  const setWeeklyGoal = useCallback(async (hours: number) => {
    await setWeeklyGoalDb(hours);
    setWeeklyGoalState(hours);
  }, []);

  return {
    weeklyTrend,
    monthlyTrend,
    clientProfitability,
    avgSessionStats,
    busiestDays,
    weeklyGoal,
    currentWeekHours,
    isLoading,
    setWeeklyGoal,
    refresh: loadData,
  };
}
