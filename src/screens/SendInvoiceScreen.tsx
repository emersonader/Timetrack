import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
import { createInvoice, markInvoiceSent, getMonthlyInvoiceCount } from '../db/invoiceRepository';
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
  const { t } = useTranslation();
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
          t('sendInvoice.businessEmailNotSet'),
          t('sendInvoice.businessEmailNotSetMessage'),
          [{ text: t('common.ok') }]
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
      t('sendInvoice.invoiceSent'),
      hasBusinessEmail
        ? t('sendInvoice.sendRecordCopyQuestion')
        : t('sendInvoice.markAsPaidQuestion'),
      hasBusinessEmail ? [
        {
          text: t('sendInvoice.skip'),
          style: 'cancel',
          onPress: () => showMarkAsPaidDialog(),
        },
        {
          text: t('sendInvoice.sendRecordCopy'),
          onPress: async () => {
            await handleSendRecordCopy();
            showMarkAsPaidDialog();
          },
        },
      ] : [
        {
          text: t('sendInvoice.keepItems'),
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: t('sendInvoice.markAsPaid'),
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
      t('sendInvoice.markAsPaidTitle'),
      t('sendInvoice.clearItemsAfterSendQuestion'),
      [
        {
          text: t('sendInvoice.keepItems'),
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
        {
          text: t('sendInvoice.markAsPaid'),
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

    // Check monthly invoice limit for free tier
    if (!checkFeatureAccess('unlimited_invoices')) {
      const monthlyCount = await getMonthlyInvoiceCount();
      if (monthlyCount >= 10) {
        navigation.navigate('Paywall', { feature: 'unlimited_invoices' });
        return;
      }
    }

    if (!selectedClient.email) {
      Alert.alert(
        t('sendInvoice.noEmailAddress'),
        t('sendInvoice.noEmailAddressMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('sendInvoice.share'),
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
      Alert.alert(t('common.error'), t('sendInvoice.failedToSend'));
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

    // Check monthly invoice limit for free tier
    if (!checkFeatureAccess('unlimited_invoices')) {
      const monthlyCount = await getMonthlyInvoiceCount();
      if (monthlyCount >= 10) {
        navigation.navigate('Paywall', { feature: 'unlimited_invoices' });
        return;
      }
    }

    if (!selectedClient.phone) {
      Alert.alert(t('sendInvoice.noPhoneNumber'), t('sendInvoice.noPhoneNumberMessage'));
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
      Alert.alert(t('common.error'), t('sendInvoice.failedToSend'));
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

    // Check monthly invoice limit for free tier
    if (!checkFeatureAccess('unlimited_invoices')) {
      const monthlyCount = await getMonthlyInvoiceCount();
      if (monthlyCount >= 10) {
        navigation.navigate('Paywall', { feature: 'unlimited_invoices' });
        return;
      }
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
      Alert.alert(t('common.error'), t('sendInvoice.failedToShare'));
    } finally {
      setIsSending(false);
    }
  };

  // Loading states
  if (isLoadingClients) {
    return <LoadingSpinner fullScreen message={t('sendInvoice.loadingClients')} />;
  }

  // Client selector view
  if (showClientSelector) {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder={t('sendInvoice.searchClients')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </View>

        {clients.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t('sendInvoice.noClients')}
            message={t('sendInvoice.noClientsMessage')}
            actionLabel={t('sendInvoice.addClient')}
            onAction={() => navigation.navigate('AddClient')}
          />
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ClientCardCompact
                client={item}
                onPress={() => handleSelectClient(item)}
                selected={item.id === selectedClientId}
              />
            )}
            style={styles.clientList}
            contentContainerStyle={styles.clientListContent}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </View>
    );
  }

  // Invoice preview view
  if (!selectedClient) {
    return <LoadingSpinner fullScreen message={t('sendInvoice.loadingClientDetails')} />;
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={isSending} message={t('sendInvoice.sendingInvoice')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Selected Client */}
        <View style={styles.selectedClientCard}>
          <View style={styles.selectedClientInfo}>
            <Text style={styles.selectedClientLabel}>{t('sendInvoice.invoiceFor')}</Text>
            <Text style={styles.selectedClientName}>
              {formatFullName(selectedClient.first_name, selectedClient.last_name)}
            </Text>
            <Text style={styles.selectedClientRate}>
              {formatCurrency(selectedClient.hourly_rate, selectedClient.currency)}/hr
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={handleChangeClient}
          >
            <Text style={styles.changeButtonText}>{t('sendInvoice.change')}</Text>
          </TouchableOpacity>
        </View>

        {/* Invoice Summary */}
        {(isLoadingSessions || isLoadingMaterials) ? (
          <LoadingSpinner size="small" message={t('sendInvoice.loadingSessionsAndMaterials')} />
        ) : !hasInvoiceableItems ? (
          <View style={styles.noSessionsCard}>
            <Ionicons name="alert-circle" size={48} color={COLORS.warning} />
            <Text style={styles.noSessionsTitle}>{t('sendInvoice.nothingToInvoice')}</Text>
            <Text style={styles.noSessionsText}>
              {t('sendInvoice.nothingToInvoiceMessage')}
            </Text>
            <Button
              title={t('sendInvoice.goToClient')}
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
              <Text style={styles.summaryTitle}>{t('sendInvoice.invoiceSummary')}</Text>

              {unbilledSessions.length > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('sendInvoice.totalTime')}</Text>
                    <Text style={styles.summaryValue}>{formatDurationHuman(totalDuration)}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('sendInvoice.hourlyRate')}</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(selectedClient.hourly_rate, selectedClient.currency)}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('sendInvoice.laborSubtotal')}</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(totalBillable, selectedClient.currency)}
                    </Text>
                  </View>
                </>
              )}

              {materials.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('sendInvoice.materialsSubtotal')}</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(totalMaterialCost, selectedClient.currency)}
                  </Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>{t('sendInvoice.totalAmount')}</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(totalInvoiceAmount, selectedClient.currency)}
                </Text>
              </View>
            </View>

            {/* Sessions List */}
            {unbilledSessions.length > 0 && (
              <View style={styles.sessionsCard}>
                <Text style={styles.sessionsTitle}>
                  {t('sendInvoice.timeSessions', { count: unbilledSessions.length })}
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
                        {formatCurrency(session.billable_amount, selectedClient.currency)}
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
                  {t('sendInvoice.materials', { count: materials.length })}
                </Text>
                {materials.map((material) => (
                  <View key={material.id} style={styles.sessionItem}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDate}>{material.name}</Text>
                    </View>
                    <View style={styles.sessionStats}>
                      <Text style={styles.sessionAmount}>
                        {formatCurrency(material.cost, selectedClient.currency)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Custom Message */}
            <Input
              label={t('sendInvoice.customMessage')}
              placeholder={t('sendInvoice.customMessagePlaceholder')}
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={3}
              containerStyle={styles.messageInput}
            />

            {/* Send Buttons */}
            <View style={styles.sendButtons}>
              <Button
                title={canEmailInvoices ? t('sendInvoice.emailWithPdf') : t('sendInvoice.emailWithPdfPremium')}
                onPress={handleSendEmail}
                variant="primary"
                fullWidth
                disabled={isSending}
                icon={<Ionicons name={canEmailInvoices ? "mail" : "lock-closed"} size={20} color={COLORS.white} />}
              />
              <Button
                title={canExportPdf ? t('sendInvoice.iMessageWhatsApp') : t('sendInvoice.iMessageWhatsAppPremium')}
                onPress={handleShare}
                variant="secondary"
                fullWidth
                disabled={isSending}
                icon={<Ionicons name={canExportPdf ? "chatbubbles" : "lock-closed"} size={20} color={COLORS.white} />}
                style={styles.smsButton}
              />
              <Button
                title={canSmsInvoices ? t('sendInvoice.smsTextOnly') : t('sendInvoice.smsTextOnlyPremium')}
                onPress={handleSendSms}
                variant="outline"
                fullWidth
                disabled={isSending}
                icon={<Ionicons name={canSmsInvoices ? "chatbubble-outline" : "lock-closed"} size={20} color={COLORS.primary} />}
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
