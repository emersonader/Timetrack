import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Invoice } from '../types';
import { getAllInvoices } from '../db/invoiceRepository';
import { getClientById } from '../db/clientRepository';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useSubscription } from '../contexts/SubscriptionContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceHistory'>;

interface InvoiceWithClient extends Invoice {
  clientName: string;
}

export function InvoiceHistoryScreen({ navigation }: Props) {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { checkFeatureAccess } = useSubscription();
  const hasUnlimitedHistory = checkFeatureAccess('unlimited_history');

  const loadInvoices = useCallback(async () => {
    try {
      const allInvoices = await getAllInvoices();
      const clientNameCache: Record<number, string> = {};

      const invoicesWithClients: InvoiceWithClient[] = await Promise.all(
        allInvoices.map(async (invoice) => {
          if (clientNameCache[invoice.client_id] === undefined) {
            const client = await getClientById(invoice.client_id);
            clientNameCache[invoice.client_id] = client
              ? `${client.first_name} ${client.last_name}`
              : 'Unknown Client';
          }
          return {
            ...invoice,
            clientName: clientNameCache[invoice.client_id],
          };
        })
      );

      // Filter to last 30 days for free tier users
      let displayInvoices = invoicesWithClients;
      if (!hasUnlimitedHistory) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        displayInvoices = invoicesWithClients.filter(
          (inv) => new Date(inv.created_at) >= thirtyDaysAgo
        );
      }
      setInvoices(displayInvoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasUnlimitedHistory]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadInvoices();
    }, [loadInvoices])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadInvoices();
  }, [loadInvoices]);

  const renderStatusBadge = (invoice: Invoice) => {
    if (invoice.sent_date && invoice.send_method) {
      const label =
        invoice.send_method === 'email' ? 'Sent via Email' : 'Sent via SMS';
      return (
        <View style={styles.badgeSent}>
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={COLORS.white}
            style={styles.badgeIcon}
          />
          <Text style={styles.badgeSentText}>{label}</Text>
        </View>
      );
    }
    return (
      <View style={styles.badgeDraft}>
        <Text style={styles.badgeDraftText}>Draft</Text>
      </View>
    );
  };

  const renderInvoiceCard = ({ item }: { item: InvoiceWithClient }) => (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.clientName} numberOfLines={1}>
          {item.clientName}
        </Text>
        <Text style={styles.amount}>{formatCurrency(item.total_amount, item.currency)}</Text>
      </View>
      <Text style={styles.details}>
        {item.total_hours} hours • {formatDate(item.created_at)}
      </Text>
      {renderStatusBadge(item)}
    </View>
  );

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="document-text-outline"
          size={48}
          color={COLORS.gray300}
        />
        <Text style={styles.emptyTitle}>No invoices yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first invoice!
        </Text>
      </View>
    );
  };

  return (
    <ErrorBoundary>
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderInvoiceCard}
        ListHeaderComponent={!hasUnlimitedHistory ? (
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
        ) : null}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          invoices.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  amount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  details: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },

  // Status badges
  badgeSent: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeSentText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  badgeDraft: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeDraftText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray600,
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
    marginBottom: SPACING.sm,
  },
  historyBannerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: '500',
    flex: 1,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
  },
});
