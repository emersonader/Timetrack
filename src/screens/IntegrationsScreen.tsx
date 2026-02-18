import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useIntegrations } from '../hooks/useIntegrations';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'Integrations'>;

export function IntegrationsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { checkFeatureAccess } = useSubscription();
  const {
    calendars,
    syncedCalendars,
    isLoading,
    isSyncing,
    toggleCalendarSync,
    syncNow,
    exportQuickBooks,
    exportXero,
    focusListener,
  } = useIntegrations();

  // Date range for accounting exports
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // first of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Pro gate
  if (!checkFeatureAccess('integrations')) {
    navigation.replace('Paywall', { feature: 'integrations' });
    return null;
  }

  // Register focus listener
  useEffect(() => {
    const unsubscribe = focusListener();
    return unsubscribe;
  }, [focusListener]);

  const isSyncedCalendar = (calendarId: string) =>
    syncedCalendars.some(sc => sc.calendar_id === calendarId);

  const getLastSynced = (calendarId: string): string | null => {
    const synced = syncedCalendars.find(sc => sc.calendar_id === calendarId);
    return synced?.last_synced ?? null;
  };

  const formatLastSynced = (isoDate: string | null): string => {
    if (!isoDate) return t('integrations.neverSynced');
    const d = new Date(isoDate);
    return t('integrations.lastSynced', {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  const validateDateRange = (): boolean => {
    if (!startDate || !endDate) {
      Alert.alert(t('integrations.missingDates'), t('integrations.pleaseEnterBothDates'));
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      Alert.alert(t('integrations.invalidFormat'), t('integrations.pleaseUseYyyyMmDdFormat'));
      return false;
    }
    if (startDate > endDate) {
      Alert.alert(t('integrations.invalidRange'), t('integrations.startDateMustBeBeforeEndDate'));
      return false;
    }
    return true;
  };

  const handleExportQuickBooks = () => {
    if (!validateDateRange()) return;
    exportQuickBooks(startDate, endDate);
  };

  const handleExportXero = () => {
    if (!validateDateRange()) return;
    exportXero(startDate, endDate);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Loading integrations..." />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ---- Calendar Sync Card ---- */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Calendar Sync</Text>
        </View>

        <Text style={styles.infoText}>
          Syncs completed time sessions as calendar events
        </Text>

        {calendars.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              No calendars found. Please grant calendar permissions in your device settings.
            </Text>
          </View>
        ) : (
          calendars.map(cal => {
            const enabled = isSyncedCalendar(cal.id);
            const lastSynced = getLastSynced(cal.id);
            return (
              <View key={cal.id} style={styles.calendarRow}>
                <View style={styles.calendarInfo}>
                  <Text style={styles.calendarName} numberOfLines={1}>
                    {cal.title}
                  </Text>
                  {enabled && (
                    <Text style={styles.lastSyncedText}>
                      {formatLastSynced(lastSynced)}
                    </Text>
                  )}
                </View>

                <View style={styles.calendarActions}>
                  {enabled && (
                    <TouchableOpacity
                      style={styles.syncNowBtn}
                      onPress={() => syncNow(cal.id)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.syncNowBtnText}>Sync</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  <Switch
                    value={enabled}
                    onValueChange={() => toggleCalendarSync(cal.id, cal.title)}
                    trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
                    thumbColor={enabled ? COLORS.primary : COLORS.gray400}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ---- Accounting Export Card ---- */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Accounting Export</Text>
        </View>

        <Text style={styles.infoText}>
          Export time entries for import into QuickBooks Desktop (IIF) or Xero (CSV)
        </Text>

        {/* Date range inputs */}
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <TextInput
              style={styles.dateInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>End Date</Text>
            <TextInput
              style={styles.dateInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
        </View>

        {/* Export buttons */}
        <View style={styles.exportBtnRow}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportQuickBooks}
            disabled={isSyncing}
          >
            <Ionicons name="download-outline" size={18} color={COLORS.white} />
            <Text style={styles.exportBtnText}>QuickBooks (.iif)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: COLORS.secondary }]}
            onPress={handleExportXero}
            disabled={isSyncing}
          >
            <Ionicons name="download-outline" size={18} color={COLORS.white} />
            <Text style={styles.exportBtnText}>Xero (.csv)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---- Coming Soon Card ---- */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="rocket-outline" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Coming Soon</Text>
        </View>

        <View style={styles.comingSoonRow}>
          <Ionicons name="card-outline" size={20} color={COLORS.gray500} />
          <Text style={styles.comingSoonName}>Stripe Connect</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
          </View>
        </View>

        <View style={styles.comingSoonRow}>
          <Ionicons name="cloud-outline" size={20} color={COLORS.gray500} />
          <Text style={styles.comingSoonName}>Direct QuickBooks Online API</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
          </View>
        </View>

        <View style={styles.comingSoonRow}>
          <Ionicons name="sync-outline" size={20} color={COLORS.gray500} />
          <Text style={styles.comingSoonName}>Direct Xero API</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.md,
  },

  // Calendar rows
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  lastSyncedText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  calendarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  syncNowBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncNowBtnText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Empty state
  emptyRow: {
    paddingVertical: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    textAlign: 'center',
  },

  // Date range
  dateRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },

  // Export buttons
  exportBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  exportBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Coming Soon rows
  comingSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
  },
  comingSoonName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  comingSoonBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
  },
  comingSoonBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray500,
  },
});
