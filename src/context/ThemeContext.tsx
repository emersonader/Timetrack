import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { UserSettings } from '../types';
import { getSettings } from '../db/settingsRepository';
import { LIGHT_COLORS, DARK_COLORS } from '../utils/constants';

const DEFAULT_PRIMARY_COLOR = '#059669';
const DEFAULT_ACCENT_COLOR = '#059669';

export type DarkModePreference = 'auto' | 'light' | 'dark';

interface ThemeContextType {
  primaryColor: string;
  accentColor: string;
  settings: UserSettings | null;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
  isDark: boolean;
  colors: typeof LIGHT_COLORS;
  darkMode: DarkModePreference;
  setDarkMode: (mode: DarkModePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<DarkModePreference>('auto');

  const systemColorScheme = useColorScheme();

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const result = await getSettings();
      setSettings(result);
    } catch (error) {
      console.error('Error loading theme settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const primaryColor = settings?.primary_color || DEFAULT_PRIMARY_COLOR;
  const accentColor = settings?.accent_color || DEFAULT_ACCENT_COLOR;

  // Resolve dark mode: 'auto' follows system, otherwise use explicit preference
  const isDark =
    darkMode === 'auto'
      ? systemColorScheme === 'dark'
      : darkMode === 'dark';

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider
      value={{
        primaryColor,
        accentColor,
        settings,
        isLoading,
        refreshTheme: loadSettings,
        isDark,
        colors,
        darkMode,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Color presets for the color picker
export const COLOR_PRESETS = [
  { name: 'Emerald', value: '#059669' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
];
