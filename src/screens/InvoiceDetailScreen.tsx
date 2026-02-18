import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Invoice, Client, TimeSession, Material } from '../types';
import { getInvoiceById, parseSessionIds, deleteInvoice } from '../db/invoiceRepository';
import { getClientById } from '../db/clientRepository';
import { getSessionById } from '../db/sessionRepository';
import { getMaterialsByClientId } from '../db/materialRepository';
import { generateInvoicePreview } from '../services/invoiceService';
import { shareInvoice } from '../services/shareService';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../context/ThemeContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatFullName,
  secondsToHours,
  formatTimeRange,
} from '../utils/formatters';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceDetail'>;

export function InvoiceDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { invoiceId } = route.params;
  const { settings } = useSettings();
  const { primaryColor, colors } = useTheme();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      const inv = await getInvoiceById(invoiceId);
      if (!inv) {
        Alert.alert(t('common.error'), t('invoiceDetail.invoiceNotFound'));
        navigation.goBack();
        return;
      }
      setInvoice(inv);

      const c = await getClientById(inv.client_id);
      setClient(c);

      // Load original sessions
      const sessionIds = parseSessionIds(inv.session_ids);
      const loadedSessions: TimeSession[] = [];
      for (const sid of sessionIds) {
        const session = await getSessionById(sid);
        if (session) loadedSessions.push(session);
      }
      setSessions(loadedSessions);

      // Load materials for this client
      if (c) {
        const mats = await getMaterialsByClientId(c.id);
        setMaterials(mats);
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
      Alert.alert(t('common.error'), t('invoiceDetail.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!invoice || !client) return;
    setIsSharing(true);
    try {
      const preview = generateInvoicePreview(client, sessions, materials);
      await shareInvoice(preview, undefined, settings ?? undefined);
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert(t('common.error'), t('invoiceDetail.failedToShare'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('invoiceDetail.deleteInvoiceTitle'),
      t('invoiceDetail.deleteInvoiceMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvoice(invoiceId);
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('common.error'), t('invoiceDetail.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <LoadingSpinner message={t('invoiceDetail.loadingInvoice')} />
      </View>
    );
  }

  if (!invoice || !client) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>{t('invoiceDetail.invoiceNotFound')}</Text>
      </View>
    );
  }

  // Calculate totals from sessions if available, otherwise use invoice stored values
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = sessions.length > 0 ? secondsToHours(totalSeconds) : invoice.total_hours;
  const laborTotal = totalHours * client.hourly_rate;
  const materialsTotal = materials.reduce((sum, m) => sum + m.cost, 0);
  const hasSessions = sessions.length > 0;
  const hasMaterials = materials.length > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Invoice Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>{t('invoiceDetail.invoiceFor')}</Text>
        <Text style={[styles.clientName, { color: colors.textPrimary }]}>
          {formatFullName(client.first_name, client.last_name)}
        </Text>
        <Text style={[styles.rate, { color: primaryColor }]}>
          {`${formatCurrency(client.hourly_rate, client.currency)}/hr`}
        </Text>

        {client.email ? (
          <Text style={[styles.clientDetail, { color: colors.gray500 }]}>
            {client.email}
          </Text>
        ) : null}
        {client.phone ? (
          <Text style={[styles.clientDetail, { color: colors.gray500 }]}>
            {client.phone}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('invoiceDetail.invoiceDate')}</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {formatDate(invoice.created_at)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('invoiceDetail.totalHours')}</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {`${invoice.total_hours}h`}
          </Text>
        </View>
        {hasSessions ? (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('invoiceDetail.sessions')}</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              {t('invoiceDetail.sessionCount', { count: sessions.length })}
            </Text>
          </View>
        ) : null}
        {hasMaterials ? (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('invoiceDetail.materials')}</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              {t('invoiceDetail.materialCount', { count: materials.length })}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Time Entries */}
      {hasSessions ? (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={16} color={primaryColor} />
            <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>{t('invoiceDetail.timeEntries')}</Text>
          </View>
          {sessions.map((session, index) => {
            const hours = secondsToHours(session.duration);
            const amount = hours * client.hourly_rate;
            return (
              <View
                key={session.id}
                style={[
                  styles.sessionRow,
                  index < sessions.length - 1 ? styles.rowBorder : undefined,
                ]}
              >
                <View style={styles.sessionInfo}>
                  <Text style={[styles.sessionDate, { color: colors.textPrimary }]}>
                    {formatDate(session.date)}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: colors.gray500 }]}>
                    {`${formatTimeRange(session.start_time, session.end_time)} \u2022 ${formatDuration(session.duration)}`}
                  </Text>
                  {session.notes ? (
                    <Text style={[styles.sessionNotes, { color: colors.gray400 }]} numberOfLines={1}>
                      {session.notes}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.sessionAmount, { color: colors.textPrimary }]}>
                  {formatCurrency(amount, client.currency)}
                </Text>
              </View>
            );
          })}
          <View style={[styles.subtotalRow, { borderTopColor: colors.gray200 }]}>
            <Text style={[styles.subtotalLabel, { color: colors.gray500 }]}>{t('invoiceDetail.laborSubtotal')}</Text>
            <Text style={[styles.subtotalValue, { color: colors.textPrimary }]}>
              {formatCurrency(laborTotal, client.currency)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Materials */}
      {hasMaterials ? (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube-outline" size={16} color={primaryColor} />
            <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>{t('invoiceDetail.materialsAndCosts')}</Text>
          </View>
          {materials.map((material, index) => (
            <View
              key={material.id}
              style={[
                styles.materialRow,
                index < materials.length - 1 ? styles.rowBorder : undefined,
              ]}
            >
              <Text style={[styles.materialName, { color: colors.textPrimary }]} numberOfLines={1}>
                {material.name}
              </Text>
              <Text style={[styles.materialCost, { color: colors.textPrimary }]}>
                {formatCurrency(material.cost, client.currency)}
              </Text>
            </View>
          ))}
          <View style={[styles.subtotalRow, { borderTopColor: colors.gray200 }]}>
            <Text style={[styles.subtotalLabel, { color: colors.gray500 }]}>{t('invoiceDetail.materialsSubtotal')}</Text>
            <Text style={[styles.subtotalValue, { color: colors.textPrimary }]}>
              {formatCurrency(materialsTotal, client.currency)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Grand Total */}
      <View style={[styles.totalCard, { backgroundColor: primaryColor }]}>
        <Text style={styles.totalCardLabel}>{t('invoiceDetail.total')}</Text>
        <Text style={styles.totalCardAmount}>
          {formatCurrency(invoice.total_amount, invoice.currency)}
        </Text>
        {hasMaterials ? (
          <Text style={styles.totalCardBreakdown}>
            {t('invoiceDetail.totalBreakdown', { 
              labor: formatCurrency(laborTotal, client.currency),
              materials: formatCurrency(materialsTotal, client.currency)
            })}
          </Text>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title={isSharing ? t('invoiceDetail.sharing') : t('invoiceDetail.shareInvoicePdf')}
          onPress={handleShare}
          disabled={isSharing}
          icon={<Ionicons name="share-outline" size={18} color={COLORS.white} />}
          style={styles.shareBtn}
        />
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: COLORS.error }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={[styles.deleteBtnText, { color: COLORS.error }]}>{t('invoiceDetail.deleteInvoice')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Summary Card
  summaryCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  clientName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  rate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  clientDetail: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
  },
  summaryValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Section Card (Sessions / Materials)
  sectionCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Session rows
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  sessionInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  sessionDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  sessionMeta: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  sessionNotes: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  sessionAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Material rows
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  materialName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    flex: 1,
    marginRight: SPACING.sm,
  },
  materialCost: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // Subtotal row
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
  },
  subtotalLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  subtotalValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },

  // Grand Total Card
  totalCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  totalCardLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  totalCardAmount: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  totalCardBreakdown: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: SPACING.xs,
  },

  // Actions
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  shareBtn: {
    marginBottom: 0,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});
