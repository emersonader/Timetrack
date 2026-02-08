import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getHours } from 'date-fns';
import { RootStackParamList, Client } from '../types';
import { useRecentClients, useClients } from '../hooks/useClients';
import { useTimer } from '../hooks/useTimer';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useSettings } from '../hooks/useSettings';
import { useDashboardStats } from '../hooks/useDashboard';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import {
  formatFullName,
  formatDuration,
  formatCurrency,
  secondsToHours,
  formatDate,
} from '../utils/formatters';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = getHours(new Date());
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MainScreen({ navigation }: Props) {
  const { clients: recentClients, isLoading, refresh } = useRecentClients(5);
  const { clients: allClients, refresh: refreshAllClients } = useClients();
  const { timerState, activeClient } = useTimer();
  const { primaryColor, colors, isDark } = useTheme();
  const { canAddMoreClients } = useSubscription();
  const { settings, refresh: refreshSettings } = useSettings();
  const {
    todaySeconds,
    todayEarnings,
    weekSeconds,
    weekEarnings,
    isLoading: statsLoading,
  } = useDashboardStats();

  // Refresh data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshAllClients();
      refreshSettings();
    }, [refresh, refreshAllClients, refreshSettings])
  );

  // Navigation handlers
  const handleChooseClient = () => navigation.navigate('ChooseClient');

  const handleAddClient = () => {
    if (canAddMoreClients(allClients.length)) {
      navigation.navigate('AddClient');
    } else {
      navigation.navigate('Paywall', { feature: 'unlimited_clients' });
    }
  };

  const handleSendInvoice = () => navigation.navigate('SendInvoice', {});

  const handleRecentClientPress = (client: Client) =>
    navigation.navigate('ClientDetails', { clientId: client.id });

  const handleTimerAction = () => {
    if (timerState.isRunning && activeClient) {
      navigation.navigate('ClientDetails', { clientId: activeClient.id });
    } else {
      navigation.navigate('ChooseClient');
    }
  };

  // Derive greeting
  const businessName = settings?.business_name;
  const greeting = businessName
    ? `${getGreeting()}, ${businessName}`
    : getGreeting();

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderStatCard = (
    label: string,
    value: string,
    iconName: keyof typeof Ionicons.glyphMap,
    iconColor: string,
  ) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.statIconWrap, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.gray500 }]}>{label}</Text>
    </View>
  );

  const renderRecentClient = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={[styles.recentCard, { backgroundColor: colors.surface }]}
      onPress={() => handleRecentClientPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.recentAvatar, { backgroundColor: primaryColor }]}>
        <Text style={styles.recentAvatarText}>
          {item.first_name.charAt(0)}
          {item.last_name.charAt(0)}
        </Text>
      </View>
      <Text style={[styles.recentName, { color: colors.textPrimary }]} numberOfLines={1}>
        {formatFullName(item.first_name, item.last_name)}
      </Text>
      <Text style={[styles.recentRate, { color: colors.gray500 }]}>
        {formatCurrency(item.hourly_rate, item.currency)}/hr
      </Text>
    </TouchableOpacity>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* ---- Greeting Header ---- */}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="settings-outline" size={22} color={colors.gray500} />
        </TouchableOpacity>
      </View>

      {/* ---- Active Timer Card ---- */}
      {timerState.isRunning && activeClient && (
        <TouchableOpacity
          style={[styles.timerCard, { backgroundColor: primaryColor }]}
          onPress={() =>
            navigation.navigate('ClientDetails', { clientId: activeClient.id })
          }
          activeOpacity={0.8}
        >
          <View style={styles.timerCardTop}>
            <View style={styles.timerDot} />
            <Text style={styles.timerLabel}>Timer Running</Text>
          </View>
          <Text style={styles.timerTime}>
            {formatDuration(timerState.elapsedSeconds)}
          </Text>
          <Text style={styles.timerClient}>
            {formatFullName(activeClient.first_name, activeClient.last_name)}
          </Text>
        </TouchableOpacity>
      )}

      {/* ---- This Week Stats ---- */}
      <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>This Week</Text>
      <View style={styles.statsRow}>
        {renderStatCard(
          'Hours',
          `${secondsToHours(weekSeconds)}h`,
          'time-outline',
          '#059669',
        )}
        {renderStatCard(
          'Earnings',
          formatCurrency(weekEarnings),
          'wallet-outline',
          '#22C55E',
        )}
      </View>

      {/* ---- Quick Actions ---- */}
      <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {/* Start / View Timer */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: primaryColor }]}
          onPress={handleTimerAction}
          activeOpacity={0.8}
        >
          <Ionicons
            name={timerState.isRunning ? 'eye' : 'play'}
            size={22}
            color={COLORS.white}
          />
          <Text style={styles.actionBtnTextPrimary}>
            {timerState.isRunning ? 'View Timer' : 'Start Timer'}
          </Text>
        </TouchableOpacity>

        {/* Add Client */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary, { backgroundColor: colors.surface }]}
          onPress={handleAddClient}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={22} color={primaryColor} />
          <Text style={[styles.actionBtnText, { color: primaryColor }]}>
            Add Client
          </Text>
        </TouchableOpacity>

        {/* Send Invoice */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline, { backgroundColor: colors.surface, borderColor: colors.gray200 }]}
          onPress={handleSendInvoice}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={22} color={colors.gray600} />
          <Text style={[styles.actionBtnText, { color: colors.gray600 }]}>
            Invoice
          </Text>
        </TouchableOpacity>

        {/* Reports */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline, { backgroundColor: colors.surface, borderColor: colors.gray200 }]}
          onPress={() => navigation.navigate('Reports')}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart-outline" size={22} color={colors.gray600} />
          <Text style={[styles.actionBtnText, { color: colors.gray600 }]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* ---- Recent Clients ---- */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>Recent Clients</Text>
        {recentClients.length > 0 && (
          <TouchableOpacity onPress={handleChooseClient}>
            <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <LoadingSpinner size="small" message="Loading..." />
      ) : recentClients.length === 0 ? (
        <View style={[styles.emptyRecent, { backgroundColor: colors.surface }]}>
          <Ionicons name="people-outline" size={32} color={colors.gray300} />
          <Text style={[styles.emptyRecentText, { color: colors.gray500 }]}>No clients yet</Text>
          <Button
            title="Add Your First Client"
            onPress={handleAddClient}
            variant="outline"
            size="small"
            style={styles.emptyRecentButton}
          />
        </View>
      ) : (
        <FlatList
          data={recentClients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRecentClient}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentList}
          scrollEnabled
        />
      )}
    </ScrollView>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },

  // Active Timer Card
  timerCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  timerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
  },
  timerLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerTime: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  timerClient: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Section Title
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  seeAll: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    width: '48.5%' as any,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  actionBtnSecondary: {
    backgroundColor: COLORS.white,
  },
  actionBtnOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  actionBtnTextPrimary: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionBtnText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },

  // Invoice History Link
  invoiceHistoryLink: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  invoiceHistoryText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Recent Clients (horizontal cards)
  recentList: {
    paddingRight: SPACING.md,
    gap: SPACING.sm,
  },
  recentCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  recentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  recentAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  recentName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  recentRate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },

  // Empty state
  emptyRecent: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  emptyRecentText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  emptyRecentButton: {
    marginTop: SPACING.sm,
  },
});
