import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getTodayStats, getWeekStats } from '../db/dashboardRepository';

interface DashboardStats {
  todaySeconds: number;
  todayEarnings: number;
  weekSeconds: number;
  weekEarnings: number;
  isLoading: boolean;
}

/**
 * Hook to fetch today's and this week's time/earnings stats.
 * Automatically refreshes when the screen gains focus.
 */
export function useDashboardStats(): DashboardStats {
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekSeconds, setWeekSeconds] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const [today, week] = await Promise.all([getTodayStats(), getWeekStats()]);
      setTodaySeconds(today.totalSeconds);
      setTodayEarnings(today.totalEarnings);
      setWeekSeconds(week.totalSeconds);
      setWeekEarnings(week.totalEarnings);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  return {
    todaySeconds,
    todayEarnings,
    weekSeconds,
    weekEarnings,
    isLoading,
  };
}
