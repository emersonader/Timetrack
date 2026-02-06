import { useTheme } from '../context/ThemeContext';

/**
 * Convenience hook that returns the active color palette
 * (LIGHT_COLORS or DARK_COLORS) based on the current dark mode setting.
 *
 * Usage:
 *   const colors = useColors();
 *   <View style={{ backgroundColor: colors.background }} />
 */
export function useColors() {
  const { colors } = useTheme();
  return colors;
}
