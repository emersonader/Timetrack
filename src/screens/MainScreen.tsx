import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Client } from '../types';
import { useRecentClients } from '../hooks/useClients';
import { useTimer } from '../hooks/useTimer';
import { useTheme } from '../context/ThemeContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { formatFullName, formatDuration, formatCurrency } from '../utils/formatters';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export function MainScreen({ navigation }: Props) {
  const { clients: recentClients, isLoading, refresh } = useRecentClients(5);
  const { timerState, activeClient } = useTimer();
  const { primaryColor } = useTheme();

  // Refresh recent clients when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleChooseClient = () => {
    navigation.navigate('ChooseClient');
  };

  const handleAddClient = () => {
    navigation.navigate('AddClient');
  };

  const handleSendInvoice = () => {
    navigation.navigate('SendInvoice', {});
  };

  const handleRecentClientPress = (client: Client) => {
    navigation.navigate('ClientDetails', { clientId: client.id });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Timer Banner */}
      {timerState.isRunning && activeClient && (
        <TouchableOpacity
          style={styles.timerBanner}
          onPress={() =>
            navigation.navigate('ClientDetails', { clientId: activeClient.id })
          }
        >
          <View style={styles.timerBannerLeft}>
            <View style={styles.timerDot} />
            <View>
              <Text style={styles.timerBannerLabel}>Timer Running</Text>
              <Text style={styles.timerBannerClient}>
                {formatFullName(activeClient.first_name, activeClient.last_name)}
              </Text>
            </View>
          </View>
          <Text style={styles.timerBannerTime}>
            {formatDuration(timerState.elapsedSeconds)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Main Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleChooseClient}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: primaryColor }]}>
            <Ionicons name="people" size={28} color={COLORS.white} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Choose a Client</Text>
            <Text style={styles.actionDescription}>
              Select an existing client to track time
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleAddClient}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.success }]}>
            <Ionicons name="person-add" size={28} color={COLORS.white} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Add a Client</Text>
            <Text style={styles.actionDescription}>
              Create a new client profile
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleSendInvoice}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.warning }]}>
            <Ionicons name="document-text" size={28} color={COLORS.white} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Send Invoice</Text>
            <Text style={styles.actionDescription}>
              Generate and send an invoice
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>

      {/* Recent Clients */}
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Recent Clients</Text>

        {isLoading ? (
          <LoadingSpinner size="small" message="Loading..." />
        ) : recentClients.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Ionicons
              name="people-outline"
              size={32}
              color={COLORS.gray300}
            />
            <Text style={styles.emptyRecentText}>No clients yet</Text>
            <Button
              title="Add Your First Client"
              onPress={handleAddClient}
              variant="outline"
              size="small"
              style={styles.emptyRecentButton}
            />
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentClients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={styles.recentCard}
                onPress={() => handleRecentClientPress(client)}
                activeOpacity={0.7}
              >
                <View style={styles.recentAvatar}>
                  <Text style={styles.recentAvatarText}>
                    {client.first_name.charAt(0)}
                    {client.last_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.recentContent}>
                  <Text style={styles.recentName}>
                    {formatFullName(client.first_name, client.last_name)}
                  </Text>
                  <Text style={styles.recentRate}>
                    {formatCurrency(client.hourly_rate)}/hr
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  },

  // Timer Banner
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  timerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  timerBannerLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerBannerClient: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  timerBannerTime: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },

  // Actions
  actionsContainer: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },

  // Recent Clients
  recentContainer: {
    marginBottom: SPACING.xl,
  },
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
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    paddingRight: SPACING.md,
    ...SHADOWS.sm,
  },
  recentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  recentAvatarText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  recentContent: {
    flexShrink: 1,
  },
  recentName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  recentRate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },
});
