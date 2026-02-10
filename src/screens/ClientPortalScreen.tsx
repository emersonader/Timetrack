import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Client, TimeSession, Invoice, Material } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getDatabase } from '../db/database';
import { generateClientReport, shareClientReport } from '../services/clientPortalService';
import { formatCurrency, formatDurationHuman, formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientPortal'>;

interface PortalData {
  client: Client;
  sessions: TimeSession[];
  invoices: Invoice[];
  materials: Material[];
  totalDuration: number;
  totalBilled: number;
}

export function ClientPortalScreen({ route, navigation }: Props) {
  const { clientId } = route.params;
  const { checkFeatureAccess } = useSubscription();

  const [data, setData] = useState<PortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Section toggles
  const [includeSessions, setIncludeSessions] = useState(true);
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);

  // Pro gate
  useEffect(() => {
    if (!checkFeatureAccess('client_portal')) {
      navigation.navigate('Paywall', { feature: 'client_portal' });
    }
  }, [checkFeatureAccess, navigation]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await getDatabase();

      const client = await db.getFirstAsync<Client>(
        'SELECT * FROM clients WHERE id = ?',
        [clientId]
      );
      if (!client) {
        Alert.alert('Error', 'Client not found');
        navigation.goBack();
        return;
      }

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const sessions = await db.getAllAsync<TimeSession>(
        `SELECT * FROM time_sessions
         WHERE client_id = ? AND is_active = 0 AND date >= ?
         ORDER BY date DESC, start_time DESC`,
        [clientId, ninetyDaysAgo]
      );

      const invoices = await db.getAllAsync<Invoice>(
        'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC',
        [clientId]
      );

      const materials = await db.getAllAsync<Material>(
        'SELECT * FROM materials WHERE client_id = ? ORDER BY created_at DESC',
        [clientId]
      );

      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
      const totalBilled = sessions.reduce((sum, s) => {
        const hours = s.duration / 3600;
        return sum + hours * client.hourly_rate;
      }, 0);

      setData({
        client,
        sessions,
        invoices,
        materials,
        totalDuration,
        totalBilled,
      });
    } catch (error) {
      console.error('Error loading portal data:', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleGenerateAndShare = async () => {
    try {
      setIsGenerating(true);
      const fileUri = await generateClientReport(clientId, {
        includeSessions,
        includeInvoices,
        includeMaterials,
        includePhotos,
      });
      await shareClientReport(fileUri);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate or share the report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading client portal..." />;
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray400} />
        <Text style={styles.errorText}>Unable to load client data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { client, sessions, invoices, materials, totalDuration, totalBilled } = data;
  const clientName = `${client.first_name} ${client.last_name}`;
  const recentSessions = sessions.slice(0, 5);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalMaterialsCost = materials.reduce((sum, m) => sum + m.cost, 0);

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Client Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {client.first_name.charAt(0).toUpperCase()}
                {client.last_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.clientName}>{clientName}</Text>
              <Text style={styles.headerSubtitle}>Client Progress Report</Text>
            </View>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={22} color={COLORS.primary} />
            <Text style={styles.statValue}>{formatDurationHuman(totalDuration)}</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={22} color={COLORS.success} />
            <Text style={styles.statValue}>
              {formatCurrency(totalBilled, client.currency)}
            </Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.warning} />
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentSessions.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="time-outline" size={24} color={COLORS.gray300} />
              <Text style={styles.emptyText}>No recent sessions</Text>
            </View>
          ) : (
            recentSessions.map((session) => (
              <View key={session.id} style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDate}>{formatDate(session.date)}</Text>
                  <Text style={styles.activityNotes} numberOfLines={1}>
                    {session.notes || 'No notes'}
                  </Text>
                </View>
                <Text style={styles.activityDuration}>
                  {formatDurationHuman(session.duration)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Invoice Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Invoice Summary</Text>
          <View style={styles.invoiceSummaryRow}>
            <View style={styles.invoiceStat}>
              <Text style={styles.invoiceStatValue}>{invoices.length}</Text>
              <Text style={styles.invoiceStatLabel}>Total Invoices</Text>
            </View>
            <View style={styles.invoiceDivider} />
            <View style={styles.invoiceStat}>
              <Text style={styles.invoiceStatValue}>
                {formatCurrency(totalInvoiced, client.currency)}
              </Text>
              <Text style={styles.invoiceStatLabel}>Total Invoiced</Text>
            </View>
            <View style={styles.invoiceDivider} />
            <View style={styles.invoiceStat}>
              <Text style={styles.invoiceStatValue}>
                {formatCurrency(totalMaterialsCost, client.currency)}
              </Text>
              <Text style={styles.invoiceStatLabel}>Materials</Text>
            </View>
          </View>
        </View>

        {/* Report Sections Toggles */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Report Sections</Text>
          <Text style={styles.sectionDescription}>
            Choose which sections to include in the shareable report.
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.toggleLabel}>Sessions</Text>
            </View>
            <Switch
              value={includeSessions}
              onValueChange={setIncludeSessions}
              trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
              thumbColor={includeSessions ? COLORS.primary : COLORS.gray400}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              <Text style={styles.toggleLabel}>Invoices</Text>
            </View>
            <Switch
              value={includeInvoices}
              onValueChange={setIncludeInvoices}
              trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
              thumbColor={includeInvoices ? COLORS.primary : COLORS.gray400}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
              <Text style={styles.toggleLabel}>Materials</Text>
            </View>
            <Switch
              value={includeMaterials}
              onValueChange={setIncludeMaterials}
              trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
              thumbColor={includeMaterials ? COLORS.primary : COLORS.gray400}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
              <Text style={styles.toggleLabel}>Photos</Text>
            </View>
            <Switch
              value={includePhotos}
              onValueChange={setIncludePhotos}
              trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
              thumbColor={includePhotos ? COLORS.primary : COLORS.gray400}
            />
          </View>
        </View>
      </ScrollView>

      {/* Generate & Share Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.shareButton, isGenerating && styles.shareButtonDisabled]}
          onPress={handleGenerateAndShare}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="share-outline" size={22} color={COLORS.white} />
          )}
          <Text style={styles.shareButtonText}>
            {isGenerating ? 'Generating Report...' : 'Generate & Share'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Header Card
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
    marginBottom: SPACING.md,
  },

  // Activity List
  emptyRow: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  activityInfo: {
    flex: 1,
  },
  activityDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  activityNotes: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 1,
  },
  activityDuration: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Invoice Summary
  invoiceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  invoiceStatValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  invoiceStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  invoiceDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.gray200,
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    ...SHADOWS.lg,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  shareButtonDisabled: {
    backgroundColor: COLORS.gray400,
  },
  shareButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
});
