import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { RootStackParamList } from '../types';
import { useInsights } from '../hooks/useInsights';
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
  formatDurationHuman,
} from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BAR_MAX_HEIGHT = 80;

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

export function InsightsScreen({ navigation }: Props) {
  const { isPremium } = useSubscription();
  const {
    clientInsights,
    topJobTypes,
    estimationAccuracy,
    schedulingSuggestions,
    materialCostTrend,
    seasonalPatterns,
    cashFlowProjection,
    weeklyTrend,
    isLoading,
  } = useInsights();

  // Pro gate
  if (!isPremium) {
    navigation.replace('Paywall', { feature: 'insights' });
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Analyzing your data..." />
      </View>
    );
  }

  // Trend icon
  const trendIcon = weeklyTrend.percentChange > 0
    ? 'trending-up' as const
    : weeklyTrend.percentChange < 0
      ? 'trending-down' as const
      : 'remove-outline' as const;
  const trendColor = weeklyTrend.percentChange > 0
    ? COLORS.success
    : weeklyTrend.percentChange < 0
      ? COLORS.error
      : COLORS.gray500;

  // Material cost max for bars
  const maxMaterialCost = Math.max(...materialCostTrend.map((m) => m.totalCost), 1);
  const materialMonthsWithData = materialCostTrend.filter((m) => m.totalCost > 0);

  // Cash flow max for bars
  const maxCashFlow = Math.max(...cashFlowProjection.map((m) => m.projectedEarnings), 1);

  // Seasonal max
  const maxSeasonalHours = Math.max(...seasonalPatterns.map((s) => s.avgHours), 1);

  // Best scheduling slots
  const bestSlots = schedulingSuggestions.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Weekly Earnings Trend */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>This Week</Text>
          <View style={styles.trendBadge}>
            <Ionicons name={trendIcon} size={16} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {weeklyTrend.percentChange > 0 ? '+' : ''}{weeklyTrend.percentChange}%
            </Text>
          </View>
        </View>
        <Text style={styles.bigNumber}>{formatCurrency(weeklyTrend.current)}</Text>
        <Text style={styles.subLabel}>
          vs {formatCurrency(weeklyTrend.previous)} last week
        </Text>
      </View>

      {/* Top Job Types */}
      {topJobTypes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Job Types</Text>
          {topJobTypes.slice(0, 5).map((jt, index) => (
            <View key={jt.tag} style={styles.rankRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{jt.tag}</Text>
                <Text style={styles.rankMeta}>
                  {jt.sessionCount} sessions · {Math.round(jt.totalHours * 10) / 10}h
                </Text>
              </View>
              <Text style={styles.rankValue}>{formatCurrency(jt.totalEarnings)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Estimation Accuracy */}
      {estimationAccuracy.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Estimation Accuracy</Text>
            <Ionicons name="speedometer-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.cardDescription}>
            How your actual time compares to template estimates
          </Text>
          {estimationAccuracy.slice(0, 6).map((ea) => {
            const accuracyColor = ea.accuracy >= 80
              ? COLORS.success
              : ea.accuracy >= 50
                ? COLORS.warning
                : COLORS.error;
            const direction = ea.avgActualSeconds > ea.estimatedSeconds ? 'over' : 'under';
            return (
              <View key={ea.templateTitle} style={styles.estRow}>
                <View style={styles.estInfo}>
                  <Text style={styles.estTitle} numberOfLines={1}>{ea.templateTitle}</Text>
                  <Text style={styles.estMeta}>
                    Est: {formatDurationHuman(ea.estimatedSeconds)} · Actual: {formatDurationHuman(ea.avgActualSeconds)}
                    {' · '}{ea.sessionCount} job{ea.sessionCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.estRight}>
                  <Text style={[styles.estAccuracy, { color: accuracyColor }]}>
                    {ea.accuracy}%
                  </Text>
                  <Text style={styles.estDirection}>
                    {direction === 'over' ? 'over' : 'under'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Optimal Scheduling */}
      {bestSlots.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Peak Productivity</Text>
            <Ionicons name="flash-outline" size={20} color={COLORS.warning} />
          </View>
          <Text style={styles.cardDescription}>
            Your most productive time slots by earnings/hr
          </Text>
          {bestSlots.map((slot, index) => {
            const hourLabel = slot.hourOfDay === 0
              ? '12 AM'
              : slot.hourOfDay < 12
                ? `${slot.hourOfDay} AM`
                : slot.hourOfDay === 12
                  ? '12 PM'
                  : `${slot.hourOfDay - 12} PM`;
            return (
              <View key={`${slot.dayOfWeek}-${slot.hourOfDay}`} style={styles.scheduleRow}>
                <View style={styles.scheduleTime}>
                  <Text style={styles.scheduleDay}>{DAY_NAMES[slot.dayOfWeek]}</Text>
                  <Text style={styles.scheduleHour}>{hourLabel}</Text>
                </View>
                <View style={styles.scheduleBarWrap}>
                  <View
                    style={[
                      styles.scheduleBar,
                      { width: `${(slot.avgProductivity / (bestSlots[0]?.avgProductivity || 1)) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.scheduleRate}>
                  {formatCurrency(Math.round(slot.avgProductivity))}/hr
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Material Cost Trend */}
      {materialMonthsWithData.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Material Costs</Text>
            <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.chartArea}>
            {materialCostTrend.slice(-6).map((item) => {
              const barHeight = item.totalCost > 0
                ? (item.totalCost / maxMaterialCost) * BAR_MAX_HEIGHT
                : 0;
              const monthLabel = item.month
                ? format(parseISO(item.month + '-01'), 'MMM')
                : '';
              return (
                <View key={item.month} style={styles.barColumn}>
                  {item.totalCost > 0 && (
                    <Text style={styles.barValueLabel}>
                      {formatCurrency(item.totalCost)}
                    </Text>
                  )}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        styles.barMaterial,
                        { height: Math.max(barHeight, barHeight > 0 ? 4 : 0) },
                      ]}
                    />
                  </View>
                  <Text style={styles.barDayLabel}>{monthLabel}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Cash Flow Projection */}
      {cashFlowProjection.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cash Flow Forecast</Text>
            <Ionicons name="trending-up" size={20} color={COLORS.success} />
          </View>
          <Text style={styles.cardDescription}>
            Based on your trailing 3-month average
          </Text>
          <View style={styles.chartArea}>
            {cashFlowProjection.map((item) => {
              const barHeight = item.projectedEarnings > 0
                ? (item.projectedEarnings / maxCashFlow) * BAR_MAX_HEIGHT
                : 0;
              const monthLabel = item.month
                ? format(parseISO(item.month + '-01'), 'MMM')
                : '';
              return (
                <View key={item.month} style={styles.barColumn}>
                  {item.projectedEarnings > 0 && (
                    <Text style={styles.barValueLabel}>
                      {formatCurrency(Math.round(item.projectedEarnings))}
                    </Text>
                  )}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        item.isHistorical ? styles.barHistorical : styles.barProjected,
                        { height: Math.max(barHeight, barHeight > 0 ? 4 : 0) },
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.barDayLabel,
                    !item.isHistorical && styles.barProjectedLabel,
                  ]}>
                    {monthLabel}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Actual</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary + '50' }]} />
              <Text style={styles.legendText}>Projected</Text>
            </View>
          </View>
        </View>
      )}

      {/* Seasonal Patterns */}
      {seasonalPatterns.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Seasonal Patterns</Text>
            <Ionicons name="partly-sunny-outline" size={20} color={COLORS.warning} />
          </View>
          <View style={styles.chartArea}>
            {seasonalPatterns.map((sp) => {
              const barHeight = sp.avgHours > 0
                ? (sp.avgHours / maxSeasonalHours) * BAR_MAX_HEIGHT
                : 0;
              return (
                <View key={sp.month} style={styles.barColumn}>
                  {sp.avgHours > 0 && (
                    <Text style={styles.barValueLabel}>
                      {Math.round(sp.avgHours)}h
                    </Text>
                  )}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        styles.barSeasonal,
                        { height: Math.max(barHeight, barHeight > 0 ? 4 : 0) },
                      ]}
                    />
                  </View>
                  <Text style={styles.barDayLabel}>
                    {MONTH_NAMES[sp.month - 1]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Empty State */}
      {clientInsights.length === 0 && topJobTypes.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="bulb-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>Not enough data yet</Text>
          <Text style={styles.emptyText}>
            Track more time sessions to unlock AI-powered insights about your work patterns.
          </Text>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginBottom: SPACING.md,
  },

  // Weekly trend
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
  },
  trendText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  bigNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },

  // Rank rows (job types)
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rankNumber: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rankMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 1,
  },
  rankValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.success,
  },

  // Estimation accuracy
  estRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  estInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  estTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  estMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  estRight: {
    alignItems: 'flex-end',
  },
  estAccuracy: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  estDirection: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },

  // Scheduling
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  scheduleTime: {
    width: 56,
  },
  scheduleDay: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scheduleHour: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },
  scheduleBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  scheduleBar: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: BORDER_RADIUS.full,
  },
  scheduleRate: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: 60,
    textAlign: 'right',
  },

  // Chart area (shared)
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValueLabel: {
    fontSize: 7,
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
    width: '65%',
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 4,
  },
  barMaterial: {
    backgroundColor: COLORS.error + '80',
  },
  barHistorical: {
    backgroundColor: COLORS.primary,
  },
  barProjected: {
    backgroundColor: COLORS.primary + '50',
  },
  barSeasonal: {
    backgroundColor: COLORS.warning + 'AA',
  },
  barDayLabel: {
    fontSize: 8,
    color: COLORS.gray500,
    marginTop: 4,
    height: 14,
  },
  barProjectedLabel: {
    fontStyle: 'italic',
    color: COLORS.primary,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },

  // Empty state
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
