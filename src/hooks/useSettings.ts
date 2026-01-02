import { useState, useEffect, useCallback } from 'react';
import { UserSettings, UpdateSettingsInput } from '../types';
import { getSettings, updateSettings as updateSettingsDb } from '../db/settingsRepository';

interface UseSettingsResult {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSettings: (input: UpdateSettingsInput) => Promise<void>;
}

/**
 * Hook to manage user settings
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getSettings();
      setSettings(result);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateSettings = useCallback(
    async (input: UpdateSettingsInput): Promise<void> => {
      try {
        setError(null);
        const updated = await updateSettingsDb(input);
        setSettings(updated);
      } catch (err) {
        console.error('Error updating settings:', err);
        setError('Failed to update settings');
        throw err;
      }
    },
    []
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    refresh: loadSettings,
    updateSettings: handleUpdateSettings,
  };
}
