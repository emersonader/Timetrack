import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { parseISO, format } from 'date-fns';
import { RootStackParamList } from '../types';
import { useReports } from '../hooks/useReports';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import {
  formatCurrency,
  secondsToHours,
  formatDurationHuman,
} from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';

const BAR_MAX_HEIGHT = 120;

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

export function ReportsScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const {
    dailyStats,
    clientBreakdown,
    totalSeconds,
    totalEarnings,
    isLoading,
  } = useReports(period);
  const { checkFeatureAccess } = useSubscription();
  const hasUnlimitedHistory = checkFeatureAccess('unlimited_history');

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------

  const maxSeconds = Math.max(...dailyStats.map((d) => d.totalSeconds), 1);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  function getDayLabel(dateStr: string, index: number): string {
    if (period === 'week') {
      return format(parseISO(dateStr), 'EEE'); // Mon, Tue …
    }
    // Monthly: show only every 5th day label (1-indexed day number)
    const dayNum = parseISO(dateStr).getDate();
    if (dayNum === 1 || dayNum % 5 === 0) {
      return String(dayNum);
    }
    return '';
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Loading reports..." />
      </View>
    );
  }

  const hasData = totalSeconds > 0;

  return (
    <ErrorBoundary>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ---- Period Toggle ---- */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, period === 'week' && styles.toggleBtnActive]}
          onPress={() => setPeriod('week')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              period === 'week' && styles.toggleTextActive,
            ]}
          >
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, period === 'month' && styles.toggleBtnActive]}
          onPress={() => setPeriod('month')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              period === 'month' && styles.toggleTextActive,
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Free tier history limit banner */}
      {!hasUnlimitedHistory && (
        <TouchableOpacity
          style={styles.historyBanner}
          onPress={() => navigation.navigate('Paywall', { feature: 'unlimited_history' })}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={16} color={COLORS.warning} />
          <Text style={styles.historyBannerText}>
            Free plan: showing last 30 days only
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
        </TouchableOpacity>
      )}

      {!hasData ? (
        /* ---- Empty State ---- */
        <View style={styles.emptyWrap}>
          <Ionicons name="bar-chart-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyMessage}>
            No time tracked this {period === 'week' ? 'week' : 'month'}. Start
            tracking to see your reports!
          </Text>
        </View>
      ) : (
        <>
          {/* ---- Summary Cards ---- */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.summaryValue}>
                {secondsToHours(totalSeconds)}h
              </Text>
              <Text style={styles.summaryLabel}>Total Hours</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="cash-outline" size={20} color={COLORS.success} />
              <Text style={styles.summaryValue}>
                {formatCurrency(totalEarnings)}
              </Text>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
            </View>
          </View>

          {/* ---- Daily Bar Chart ---- */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Daily Hours</Text>
            <View style={styles.chartArea}>
              {dailyStats.map((day, index) => {
                const hours = secondsToHours(day.totalSeconds);
                const barHeight =
                  day.totalSeconds > 0
                    ? (day.totalSeconds / maxSeconds) * BAR_MAX_HEIGHT
                    : 0;
                const label = getDayLabel(day.date, index);

                return (
                  <View key={day.date} style={styles.barColumn}>
                    {/* Hours label above bar */}
                    {hours > 0 && (
                      <Text style={styles.barValueLabel}>{hours}h</Text>
                    )}
                    {/* Bar */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(barHeight, barHeight > 0 ? 4 : 0),
                          },
                        ]}
                      />
                    </View>
                    {/* Day label */}
                    <Text style={styles.barDayLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ---- Client Breakdown ---- */}
          {clientBreakdown.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.chartTitle}>Client Breakdown</Text>
              {clientBreakdown.map((client) => {
                const pct =
                  totalSeconds > 0
                    ? (client.totalSeconds / totalSeconds) * 100
                    : 0;
                return (
                  <View key={client.clientId} style={styles.clientRow}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName} numberOfLines={1}>
                        {client.clientName}
                      </Text>
                      <Text style={styles.clientMeta}>
                        {formatDurationHuman(client.totalSeconds)} •{' '}
                        {formatCurrency(client.totalEarnings, client.currency)}
                      </Text>
                    </View>
                    <View style={styles.pctBarTrack}>
                      <View
                        style={[styles.pctBar, { width: `${Math.max(pct, 2)}%` }]}
                      />
                    </View>
                    <Text style={styles.pctLabel}>{Math.round(pct)}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
    </ErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  toggleTextActive: {
    color: COLORS.white,
  },

  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // Chart Card
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  chartTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },

  // Bar
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValueLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.gray500,
    marginBottom: 2,
  },
  barTrack: {
    width: '100%',
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 4,
  },
  barDayLabel: {
    fontSize: 9,
    color: COLORS.gray500,
    marginTop: 4,
    height: 14,
  },

  // Client Breakdown
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  clientInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  clientName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clientMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  pctBarTrack: {
    width: 80,
    height: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  pctBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  pctLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray500,
    width: 36,
    textAlign: 'right',
  },

  // History limit banner
  historyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.warning + '15',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  historyBannerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: '500',
    flex: 1,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});
