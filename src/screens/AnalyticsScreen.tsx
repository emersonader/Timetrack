import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { RootStackParamList } from '../types';
import { useAnalytics } from '../hooks/useAnalytics';
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
  secondsToHours,
} from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';

const BAR_MAX_HEIGHT = 100;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = NativeStackScreenProps<RootStackParamList, 'Analytics'>;

export function AnalyticsScreen({ navigation }: Props) {
  const { isPremium } = useSubscription();
  const {
    weeklyTrend,
    monthlyTrend,
    clientProfitability,
    avgSessionStats,
    busiestDays,
    weeklyGoal,
    currentWeekHours,
    isLoading,
    setWeeklyGoal,
  } = useAnalytics();

  const [trendView, setTrendView] = useState<'weekly' | 'monthly'>('weekly');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Pro gate
  if (!isPremium) {
    navigation.replace('Paywall', { feature: 'analytics' });
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Loading analytics..." />
      </View>
    );
  }

  // Weekly goal progress
  const goalProgress = weeklyGoal > 0
    ? Math.min(currentWeekHours / weeklyGoal, 1)
    : 0;
  const goalPercent = weeklyGoal > 0
    ? Math.round((currentWeekHours / weeklyGoal) * 100)
    : 0;

  // Trend data
  const trendData = trendView === 'weekly' ? weeklyTrend : monthlyTrend;
  const trendEarnings = trendData.map((d) =>
    'totalEarnings' in d ? d.totalEarnings : 0
  );
  const maxEarnings = Math.max(...trendEarnings, 1);

  // Busiest day
  const busiestDay = busiestDays.reduce(
    (max, d) => (d.totalSeconds > max.totalSeconds ? d : max),
    busiestDays[0] || { dayOfWeek: 0, totalSeconds: 0 }
  );
  const maxDaySeconds = Math.max(...busiestDays.map((d) => d.totalSeconds), 1);

  const handleSaveGoal = async () => {
    const parsed = parseInt(goalInput, 10);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid number of hours (0 to disable).');
      return;
    }
    await setWeeklyGoal(parsed);
    setEditingGoal(false);
    setGoalInput('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Weekly Goal Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Weekly Goal</Text>
          <TouchableOpacity
            onPress={() => {
              setGoalInput(String(weeklyGoal));
              setEditingGoal(!editingGoal);
            }}
          >
            <Ionicons
              name={editingGoal ? 'close-circle-outline' : 'create-outline'}
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {editingGoal ? (
          <View style={styles.goalEditRow}>
            <TextInput
              style={styles.goalInput}
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="Hours per week"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity style={styles.goalSaveBtn} onPress={handleSaveGoal}>
              <Text style={styles.goalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : weeklyGoal > 0 ? (
          <>
            <View style={styles.goalProgressTrack}>
              <View
                style={[
                  styles.goalProgressBar,
                  { width: `${Math.max(goalProgress * 100, 2)}%` },
                  goalPercent >= 100 && styles.goalComplete,
                ]}
              />
            </View>
            <View style={styles.goalLabels}>
              <Text style={styles.goalHoursText}>
                {Math.round(currentWeekHours * 10) / 10}h / {weeklyGoal}h
              </Text>
              <Text
                style={[
                  styles.goalPercentText,
                  goalPercent >= 100 && { color: COLORS.success },
                ]}
              >
                {goalPercent}%
              </Text>
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={styles.setGoalBtn}
            onPress={() => {
              setGoalInput('40');
              setEditingGoal(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.setGoalText}>Set a weekly hours goal</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Earnings Trend Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Earnings Trend</Text>
          <View style={styles.trendToggle}>
            <TouchableOpacity
              style={[
                styles.trendToggleBtn,
                trendView === 'weekly' && styles.trendToggleBtnActive,
              ]}
              onPress={() => setTrendView('weekly')}
            >
              <Text
                style={[
                  styles.trendToggleText,
                  trendView === 'weekly' && styles.trendToggleTextActive,
                ]}
              >
                8 Weeks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.trendToggleBtn,
                trendView === 'monthly' && styles.trendToggleBtnActive,
              ]}
              onPress={() => setTrendView('monthly')}
            >
              <Text
                style={[
                  styles.trendToggleText,
                  trendView === 'monthly' && styles.trendToggleTextActive,
                ]}
              >
                6 Months
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {trendData.length > 0 ? (
          <View style={styles.chartArea}>
            {trendData.map((item, index) => {
              const earnings =
                'totalEarnings' in item ? item.totalEarnings : 0;
              const barHeight =
                earnings > 0 ? (earnings / maxEarnings) * BAR_MAX_HEIGHT : 0;

              let label: string;
              if (trendView === 'weekly') {
                label = `W${index + 1}`;
              } else {
                const m = 'month' in item ? item.month : '';
                label = m ? format(parseISO(m + '-01'), 'MMM') : '';
              }

              return (
                <View key={index} style={styles.barColumn}>
                  {earnings > 0 && (
                    <Text style={styles.barValueLabel}>
                      {formatCurrency(earnings)}
                    </Text>
                  )}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(barHeight, barHeight > 0 ? 4 : 0) },
                      ]}
                    />
                  </View>
                  <Text style={styles.barDayLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No data yet</Text>
        )}
      </View>

      {/* Client Profitability Card */}
      {clientProfitability.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client Profitability</Text>
          {clientProfitability.map((client) => (
            <View key={client.clientId} style={styles.profitRow}>
              <View style={styles.profitInfo}>
                <Text style={styles.profitName} numberOfLines={1}>
                  {client.clientName}
                </Text>
                <Text style={styles.profitMeta}>
                  {Math.round(client.totalHours * 10) / 10}h
                  {' \u00B7 '}
                  Earned {formatCurrency(client.totalEarnings)}
                  {client.materialCost > 0
                    ? ` \u00B7 Materials ${formatCurrency(client.materialCost)}`
                    : ''}
                </Text>
              </View>
              <View style={styles.profitRight}>
                <Text
                  style={[
                    styles.profitNet,
                    client.netProfit < 0 && { color: COLORS.error },
                  ]}
                >
                  {formatCurrency(client.netProfit)}
                </Text>
                <Text style={styles.profitRate}>
                  {formatCurrency(Math.round(client.effectiveRate * 100) / 100)}/hr
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Time Insights Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Time Insights</Text>

        <View style={styles.insightsRow}>
          <View style={styles.insightItem}>
            <Ionicons name="timer-outline" size={24} color={COLORS.primary} />
            <Text style={styles.insightValue}>
              {formatDurationHuman(avgSessionStats.avgDurationSeconds)}
            </Text>
            <Text style={styles.insightLabel}>Avg Session</Text>
          </View>
          <View style={styles.insightItem}>
            <Ionicons name="layers-outline" size={24} color={COLORS.primary} />
            <Text style={styles.insightValue}>
              {avgSessionStats.totalSessions}
            </Text>
            <Text style={styles.insightLabel}>Total Sessions</Text>
          </View>
          <View style={styles.insightItem}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            <Text style={styles.insightValue}>
              {busiestDay.totalSeconds > 0 ? DAY_NAMES[busiestDay.dayOfWeek] : '--'}
            </Text>
            <Text style={styles.insightLabel}>Busiest Day</Text>
          </View>
        </View>

        {/* Day of week breakdown */}
        <View style={styles.dayBreakdown}>
          {busiestDays.map((day) => {
            const pct =
              day.totalSeconds > 0
                ? (day.totalSeconds / maxDaySeconds) * 100
                : 0;
            return (
              <View key={day.dayOfWeek} style={styles.dayBarCol}>
                <View style={styles.dayBarTrack}>
                  <View
                    style={[
                      styles.dayBar,
                      { height: `${Math.max(pct, pct > 0 ? 4 : 0)}%` },
                      day.dayOfWeek === busiestDay.dayOfWeek &&
                        day.totalSeconds > 0 &&
                        styles.dayBarHighlight,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    day.dayOfWeek === busiestDay.dayOfWeek &&
                      day.totalSeconds > 0 &&
                      styles.dayLabelHighlight,
                  ]}
                >
                  {DAY_NAMES[day.dayOfWeek].charAt(0)}
                </Text>
              </View>
            );
          })}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Goal
  goalProgressTrack: {
    height: 12,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  goalProgressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  goalComplete: {
    backgroundColor: COLORS.success,
  },
  goalLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalHoursText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  goalPercentText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  goalEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  goalSaveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  goalSaveBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  setGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  setGoalText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Trend toggle
  trendToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.full,
    padding: 2,
  },
  trendToggleBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  trendToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  trendToggleText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  trendToggleTextActive: {
    color: COLORS.white,
  },

  // Chart
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValueLabel: {
    fontSize: 8,
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
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  // Client Profitability
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  profitInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  profitName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  profitMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  profitRight: {
    alignItems: 'flex-end',
  },
  profitNet: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.success,
  },
  profitRate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // Time Insights
  insightsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  insightValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  insightLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },

  // Day of week breakdown
  dayBreakdown: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  dayBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  dayBarTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dayBar: {
    width: '60%',
    backgroundColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 4,
  },
  dayBarHighlight: {
    backgroundColor: COLORS.primary,
  },
  dayLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 2,
    fontWeight: '500',
  },
  dayLabelHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
