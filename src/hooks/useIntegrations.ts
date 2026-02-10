import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import { CalendarSyncConfig } from '../types';
import {
  getAvailableCalendars,
  getSyncedCalendars,
  enableCalendarSync,
  disableCalendarSync,
  syncSessionsToCalendar,
  exportToQuickBooks,
  exportToXero,
} from '../services/integrationService';

export function useIntegrations() {
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [syncedCalendars, setSyncedCalendars] = useState<CalendarSyncConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [deviceCalendars, synced] = await Promise.all([
        getAvailableCalendars(),
        getSyncedCalendars(),
      ]);
      setCalendars(deviceCalendars);
      setSyncedCalendars(synced);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload on screen focus
  const focusListener = useCallback(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  /**
   * Toggle calendar sync on/off for a given calendar
   */
  const toggleCalendarSync = useCallback(
    async (calendarId: string, calendarName: string) => {
      try {
        const existing = syncedCalendars.find(sc => sc.calendar_id === calendarId);
        if (existing) {
          await disableCalendarSync(calendarId);
        } else {
          await enableCalendarSync(calendarId, calendarName);
        }
        // Refresh synced list
        const synced = await getSyncedCalendars();
        setSyncedCalendars(synced);
      } catch (error) {
        console.error('Failed to toggle calendar sync:', error);
        Alert.alert('Error', 'Could not update calendar sync setting.');
      }
    },
    [syncedCalendars]
  );

  /**
   * Sync sessions to a specific calendar now
   */
  const syncNow = useCallback(async (calendarId: string) => {
    try {
      setIsSyncing(true);
      const count = await syncSessionsToCalendar(calendarId, 30);
      // Refresh synced calendars to get updated last_synced
      const synced = await getSyncedCalendars();
      setSyncedCalendars(synced);
      Alert.alert('Sync Complete', `${count} event${count !== 1 ? 's' : ''} synced to calendar.`);
    } catch (error) {
      console.error('Calendar sync failed:', error);
      Alert.alert('Sync Failed', 'Could not sync sessions to calendar. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Export to QuickBooks IIF format
   */
  const exportQuickBooks = useCallback(async (startDate: string, endDate: string) => {
    try {
      setIsSyncing(true);
      await exportToQuickBooks(startDate, endDate);
    } catch (error) {
      console.error('QuickBooks export failed:', error);
      Alert.alert('Export Failed', 'Could not generate QuickBooks file. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Export to Xero CSV format
   */
  const exportXero = useCallback(async (startDate: string, endDate: string) => {
    try {
      setIsSyncing(true);
      await exportToXero(startDate, endDate);
    } catch (error) {
      console.error('Xero export failed:', error);
      Alert.alert('Export Failed', 'Could not generate Xero file. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    calendars,
    syncedCalendars,
    isLoading,
    isSyncing,
    toggleCalendarSync,
    syncNow,
    exportQuickBooks,
    exportXero,
    focusListener,
    refresh: loadData,
  };
}
