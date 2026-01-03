import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Client, InvoicePreview } from '../types';
import { useClients, useClient } from '../hooks/useClients';
import { useUnbilledSessions } from '../hooks/useSessions';
import { useMaterials } from '../hooks/useMaterials';
import { useSettings } from '../hooks/useSettings';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useSessionMutations } from '../hooks/useSessions';
import { useMaterialMutations } from '../hooks/useMaterials';
import { createInvoice, markInvoiceSent } from '../db/invoiceRepository';
import { generateInvoicePreview } from '../services/invoiceService';
import {
  sendInvoiceViaEmail,
  sendInvoiceViaSms,
  shareInvoice,
  sendInvoiceRecordCopy,
} from '../services/shareService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import {
  formatFullName,
  formatCurrency,
  formatDate,
  formatDurationHuman,
  formatTimeRange,
  secondsToHours,
} from '../utils/formatters';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SearchBar } from '../components/SearchBar';
import { ClientCardCompact } from '../components/ClientCard';
import { LoadingSpinner, LoadingOverlay } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'SendInvoice'>;

export function SendInvoiceScreen({ route, navigation }: Props) {
  const preselectedClientId = route.params?.clientId;

  const { clients, isLoading: isLoadingClients, refresh: refreshClients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    preselectedClientId ?? null
  );
  const { client: selectedClient } = useClient(selectedClientId);
  const {
    sessions: unbilledSessions,
    totalDuration,
    totalBillable,
    isLoading: isLoadingSessions,
    refresh: refreshSessions,
  } = useUnbilledSessions(selectedClientId);
  const {
    materials,
    totalCost: totalMaterialCost,
    isLoading: isLoadingMaterials,
    refresh: refreshMaterials,
  } = useMaterials(selectedClientId ?? 0);
  const { settings } = useSettings();
  const { checkFeatureAccess } = useSubscription();
  const { clearAllSessions } = useSessionMutations();
  const { clearAllMaterials } = useMaterialMutations();

  // Check premium features
  const canEmailInvoices = checkFeatureAccess('email_invoices');
  const canSmsInvoices = checkFeatureAccess('sms_invoices');
  const canExportPdf = checkFeatureAccess('pdf_export');

  const [searchQuery, setSearchQuery] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [showClientSelector, setShowClientSelector] = useState(!preselectedClientId);
  const [isSending, setIsSending] = useState(false);
  const [lastInvoicePreview, setLastInvoicePreview] = useState<ReturnType<typeof generateInvoicePreview> | null>(null);

  // Check if there's anything to invoice
  const hasInvoiceableItems = unbilledSessions.length > 0 || materials.length > 0;
  const totalInvoiceAmount = totalBillable + totalMaterialCost;

  // Refresh data on focus
  useFocusEffect(
    useCallback(() => {
      refreshClients();
      if (selectedClientId) {
        refreshSessions();
        refreshMaterials();
      }
    }, [refreshClients, refreshSessions, refreshMaterials, selectedClientId])
  );

  // Filter clients based on search
  const filteredClients = clients.filter((client) => {
    if (!searchQuery) return true;
    const fullName = formatFullName(
      client.first_name,
      client.last_name
    ).toLowerCase();
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      (client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );
  });

  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setShowClientSelector(false);
    setSearchQuery('');
  };

  const handleChangeClient = () => {
    setShowClientSelector(true);
  };

  // Handle marking as paid (clear sessions and materials)
  const handleMarkAsPaid = async () => {
    if (!selectedClientId) return;

    try {
      await Promise.all([
        clearAllSessions(selectedClientId),
        clearAllMaterials(selectedClientId),
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  // Send record copy to business email
  const handleSendRecordCopy = async () => {
    if (!lastInvoicePreview) return;

    try {
      const sent = await sendInvoiceRecordCopy(lastInvoicePreview, customMessage, settings);
      if (!sent && !settings?.business_email) {
        Alert.alert(
          'Business Email Not Set',
          'To receive invoice record copies, please add your business email in Settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sending record copy:', error);
    }
  };

  // Show success dialog with option to mark as paid and send record copy
  const showSuccessDialog = () => {
    const hasBusinessEmail = !!settings?.business_email;

    Alert.alert(
      'Invoice Sent!',
      hasBusinessEmail
        ? 'Would you like to send a PDF copy to your email for records?'
        : 'Would you like to mark these items as paid and clear them?',
      hasBusinessEmail ? [
        {
          text: 'Skip',
          style: 'cancel',
          onPress: () => showMarkAsPaidDialog(),
        },
        {
          text: 'Send Record Copy',
          onPress: async () => {
            await handleSendRecordCopy();
            showMarkAsPaidDialog();
          },
        },
      ] : [
        {
          text: 'Keep Items',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Mark as Paid',
          onPress: async () => {
            await handleMarkAsPaid();
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Show mark as paid dialog
  const showMarkAsPaidDialog = () => {
    Alert.alert(
      'Mark as Paid?',
      'Would you like to clear these items now that the invoice is sent?',
      [
        {
          text: 'Keep Items',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Mark as Paid',
          onPress: async () => {
            await handleMarkAsPaid();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleSendEmail = async () => {
    if (!selectedClient || !hasInvoiceableItems) return;

    // Check premium access
    if (!canEmailInvoices) {
      navigation.navigate('Paywall', { feature: 'email_invoices' });
      return;
    }

    if (!selectedClient.email) {
      Alert.alert(
        'No Email Address',
        'This client does not have an email address. Would you like to share the invoice instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: () => handleShare(),
          },
        ]
      );
      return;
    }

    try {
      setIsSending(true);

      // Create invoice preview with materials
      const preview = generateInvoicePreview(selectedClient, unbilledSessions, materials);
      setLastInvoicePreview(preview);

      // Save invoice to database
      const invoice = await createInvoice({
        client_id: selectedClient.id,
        total_hours: secondsToHours(totalDuration),
        total_amount: totalInvoiceAmount,
        session_ids: unbilledSessions.map((s) => s.id),
      });

      // Send via email
      await sendInvoiceViaEmail(preview, customMessage, settings);

      // Mark as sent
      await markInvoiceSent(invoice.id, 'email');

      showSuccessDialog();
    } catch (error) {
      console.error('Error sending invoice:', error);
      Alert.alert('Error', 'Failed to send invoice. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSms = async () => {
    if (!selectedClient || !hasInvoiceableItems) return;

    // Check premium access
    if (!canSmsInvoices) {
      navigation.navigate('Paywall', { feature: 'sms_invoices' });
      return;
    }

    if (!selectedClient.phone) {
      Alert.alert('No Phone Number', 'This client does not have a phone number.');
      return;
    }

    try {
      setIsSending(true);

      // Create invoice preview with materials
      const preview = generateInvoicePreview(selectedClient, unbilledSessions, materials);
      setLastInvoicePreview(preview);

      // Save invoice to database
      const invoice = await createInvoice({
        client_id: selectedClient.id,
        total_hours: secondsToHours(totalDuration),
        total_amount: totalInvoiceAmount,
        session_ids: unbilledSessions.map((s) => s.id),
      });

      // Send via SMS
      await sendInvoiceViaSms(preview, customMessage, settings);

      // Mark as sent
      await markInvoiceSent(invoice.id, 'sms');

      showSuccessDialog();
    } catch (error) {
      console.error('Error sending invoice:', error);
      Alert.alert('Error', 'Failed to send invoice. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleShare = async () => {
    if (!selectedClient || !hasInvoiceableItems) return;

    // Check premium access for PDF export
    if (!canExportPdf) {
      navigation.navigate('Paywall', { feature: 'pdf_export' });
      return;
    }

    try {
      setIsSending(true);

      // Create invoice preview with materials
      const preview = generateInvoicePreview(selectedClient, unbilledSessions, materials);
      setLastInvoicePreview(preview);

      // Save invoice to database
      const invoice = await createInvoice({
        client_id: selectedClient.id,
        total_hours: secondsToHours(totalDuration),
        total_amount: totalInvoiceAmount,
        session_ids: unbilledSessions.map((s) => s.id),
      });

      // Share
      await shareInvoice(preview, customMessage, settings);

      showSuccessDialog();
    } catch (error) {
      console.error('Error sharing invoice:', error);
      Alert.alert('Error', 'Failed to share invoice. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Loading states
  if (isLoadingClients) {
    return <LoadingSpinner fullScreen message="Loading clients..." />;
  }

  // Client selector view
  if (showClientSelector) {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="Search clients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </View>

        {clients.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Clients"
            message="Add a client first to create invoices"
            actionLabel="Add Client"
            onAction={() => navigation.navigate('AddClient')}
          />
        ) : (
          <ScrollView
            style={styles.clientList}
            contentContainerStyle={styles.clientListContent}
          >
            {filteredClients.map((client) => (
              <ClientCardCompact
                key={client.id}
                client={client}
                onPress={() => handleSelectClient(client)}
                selected={client.id === selectedClientId}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // Invoice preview view
  if (!selectedClient) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={isSending} message="Sending invoice..." />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Selected Client */}
        <View style={styles.selectedClientCard}>
          <View style={styles.selectedClientInfo}>
            <Text style={styles.selectedClientLabel}>Invoice For</Text>
            <Text style={styles.selectedClientName}>
              {formatFullName(selectedClient.first_name, selectedClient.last_name)}
            </Text>
            <Text style={styles.selectedClientRate}>
              {formatCurrency(selectedClient.hourly_rate)}/hr
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={handleChangeClient}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Invoice Summary */}
        {(isLoadingSessions || isLoadingMaterials) ? (
          <LoadingSpinner size="small" message="Loading..." />
        ) : !hasInvoiceableItems ? (
          <View style={styles.noSessionsCard}>
            <Ionicons name="alert-circle" size={48} color={COLORS.warning} />
            <Text style={styles.noSessionsTitle}>Nothing to Invoice</Text>
            <Text style={styles.noSessionsText}>
              There are no time sessions or materials for this client. Track time or add materials first!
            </Text>
            <Button
              title="Go to Client"
              onPress={() =>
                navigation.navigate('ClientDetails', {
                  clientId: selectedClient.id,
                })
              }
              variant="primary"
              style={styles.noSessionsButton}
            />
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Invoice Summary</Text>

              {unbilledSessions.length > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Time</Text>
                    <Text style={styles.summaryValue}>{formatDurationHuman(totalDuration)}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Hourly Rate</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(selectedClient.hourly_rate)}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Labor Subtotal</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(totalBillable)}
                    </Text>
                  </View>
                </>
              )}

              {materials.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Materials Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(totalMaterialCost)}
                  </Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(totalInvoiceAmount)}
                </Text>
              </View>
            </View>

            {/* Sessions List */}
            {unbilledSessions.length > 0 && (
              <View style={styles.sessionsCard}>
                <Text style={styles.sessionsTitle}>
                  Time Sessions ({unbilledSessions.length})
                </Text>
                {unbilledSessions.map((session) => (
                  <View key={session.id} style={styles.sessionItem}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDate}>
                        {formatDate(session.date)}
                      </Text>
                      <Text style={styles.sessionTime}>
                        {formatTimeRange(session.start_time, session.end_time)}
                      </Text>
                    </View>
                    <View style={styles.sessionStats}>
                      <Text style={styles.sessionDuration}>
                        {formatDurationHuman(session.duration)}
                      </Text>
                      <Text style={styles.sessionAmount}>
                        {formatCurrency(session.billable_amount)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Materials List */}
            {materials.length > 0 && (
              <View style={styles.sessionsCard}>
                <Text style={styles.sessionsTitle}>
                  Materials ({materials.length})
                </Text>
                {materials.map((material) => (
                  <View key={material.id} style={styles.sessionItem}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDate}>{material.name}</Text>
                    </View>
                    <View style={styles.sessionStats}>
                      <Text style={styles.sessionAmount}>
                        {formatCurrency(material.cost)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Custom Message */}
            <Input
              label="Custom Message (Optional)"
              placeholder="Add a personal note to the invoice..."
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={3}
              containerStyle={styles.messageInput}
            />

            {/* Send Buttons */}
            <View style={styles.sendButtons}>
              <Button
                title={canEmailInvoices ? "Send via Email" : "Send via Email (Premium)"}
                onPress={handleSendEmail}
                variant="primary"
                fullWidth
                icon={<Ionicons name={canEmailInvoices ? "mail" : "lock-closed"} size={20} color={COLORS.white} />}
              />
              <Button
                title={canSmsInvoices ? "Send via SMS" : "Send via SMS (Premium)"}
                onPress={handleSendSms}
                variant="secondary"
                fullWidth
                icon={<Ionicons name={canSmsInvoices ? "chatbubble" : "lock-closed"} size={20} color={COLORS.white} />}
                style={styles.smsButton}
              />
              <Button
                title={canExportPdf ? "Share Invoice" : "Share Invoice (Premium)"}
                onPress={handleShare}
                variant="outline"
                fullWidth
                icon={<Ionicons name={canExportPdf ? "share" : "lock-closed"} size={20} color={COLORS.primary} />}
                style={styles.shareButton}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },

  // Search
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  clientList: {
    flex: 1,
  },
  clientListContent: {
    padding: SPACING.md,
  },

  // Selected Client
  selectedClientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  selectedClientInfo: {
    flex: 1,
  },
  selectedClientLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedClientName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  selectedClientRate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  changeButton: {
    padding: SPACING.sm,
  },
  changeButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // No Sessions
  noSessionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  noSessionsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  noSessionsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  noSessionsButton: {
    marginTop: SPACING.sm,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray600,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  summaryTotal: {
    borderBottomWidth: 0,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  summaryTotalLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryTotalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Sessions
  sessionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sessionsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  sessionTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  sessionDuration: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
  },
  sessionAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.success,
    marginTop: 2,
  },

  // Message Input
  messageInput: {
    marginBottom: SPACING.md,
  },

  // Send Buttons
  sendButtons: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  smsButton: {
    marginTop: 0,
  },
  shareButton: {
    marginTop: 0,
  },
});
