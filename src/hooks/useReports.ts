import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  DailyStats,
  ClientBreakdown,
  getWeeklyDailyStats,
  getMonthlyDailyStats,
  getWeeklyClientBreakdown,
  getMonthlyClientBreakdown,
} from '../db/reportsRepository';

interface UseReportsResult {
  dailyStats: DailyStats[];
  clientBreakdown: ClientBreakdown[];
  totalSeconds: number;
  totalEarnings: number;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Hook to fetch report data for the given period.
 * Automatically refreshes when the screen gains focus.
 */
export function useReports(period: 'week' | 'month'): UseReportsResult {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [clientBreakdown, setClientBreakdown] = useState<ClientBreakdown[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [stats, clients] = await Promise.all([
        period === 'week' ? getWeeklyDailyStats() : getMonthlyDailyStats(),
        period === 'week' ? getWeeklyClientBreakdown() : getMonthlyClientBreakdown(),
      ]);

      setDailyStats(stats);
      setClientBreakdown(clients);

      const totSec = stats.reduce((sum, d) => sum + d.totalSeconds, 0);
      const totEarn = stats.reduce((sum, d) => sum + d.totalEarnings, 0);
      setTotalSeconds(totSec);
      setTotalEarnings(totEarn);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return {
    dailyStats,
    clientBreakdown,
    totalSeconds,
    totalEarnings,
    isLoading,
    refresh: loadData,
  };
}
