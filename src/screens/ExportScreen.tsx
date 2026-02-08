import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  exportSessionsCSV,
  exportInvoicesCSV,
  exportClientsCSV,
  exportMaterialsCSV,
  exportExcel,
  createDatabaseBackup,
  restoreDatabase,
  shareFile,
} from '../services/exportService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Export'>;

export function ExportScreen({ navigation }: Props) {
  const { checkFeatureAccess } = useSubscription();
  const hasFullExport = checkFeatureAccess('data_export');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleExport = async (
    action: string,
    exportFn: () => Promise<string>,
    requiresPro: boolean
  ) => {
    if (requiresPro && !hasFullExport) {
      navigation.navigate('Paywall', { feature: 'data_export' });
      return;
    }

    setLoadingAction(action);
    try {
      const filePath = await exportFn();
      await shareFile(filePath);
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export data. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRestore = async () => {
    if (!hasFullExport) {
      navigation.navigate('Paywall', { feature: 'data_export' });
      return;
    }

    Alert.alert(
      'Restore from Backup',
      'This will replace all your current data with the backup file. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Backup File',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });

              if (result.canceled) return;

              setLoadingAction('restore');
              await restoreDatabase(result.assets[0].uri);
              Alert.alert(
                'Restore Complete',
                'Your data has been restored. Please restart the app for all changes to take effect.',
              );
            } catch (error: any) {
              Alert.alert('Restore Error', error.message || 'Failed to restore backup.');
            } finally {
              setLoadingAction(null);
            }
          },
        },
      ]
    );
  };

  const exportOptions = [
    {
      id: 'csv-sessions',
      icon: 'timer-outline' as const,
      title: 'Export Sessions (CSV)',
      description: hasFullExport ? 'All time sessions with tags' : 'Last 30 days of sessions',
      requiresPro: false,
      onPress: () => handleExport('csv-sessions', () => exportSessionsCSV(hasFullExport ? undefined : 30), false),
    },
    {
      id: 'csv-invoices',
      icon: 'receipt-outline' as const,
      title: 'Export Invoices (CSV)',
      description: hasFullExport ? 'All invoices' : 'Last 30 days of invoices',
      requiresPro: false,
      onPress: () => handleExport('csv-invoices', () => exportInvoicesCSV(hasFullExport ? undefined : 30), false),
    },
    {
      id: 'csv-clients',
      icon: 'people-outline' as const,
      title: 'Export Clients (CSV)',
      description: 'All client information',
      requiresPro: true,
      onPress: () => handleExport('csv-clients', exportClientsCSV, true),
    },
    {
      id: 'csv-materials',
      icon: 'construct-outline' as const,
      title: 'Export Materials (CSV)',
      description: 'All materials with costs',
      requiresPro: true,
      onPress: () => handleExport('csv-materials', exportMaterialsCSV, true),
    },
    {
      id: 'excel',
      icon: 'grid-outline' as const,
      title: 'Export All Data (Excel)',
      description: 'Sessions, clients, invoices, and materials',
      requiresPro: true,
      onPress: () => handleExport('excel', exportExcel, true),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Export Data</Text>
      <Text style={styles.pageSubtitle}>
        Export your data as CSV or Excel
      </Text>

      {exportOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={styles.card}
          onPress={option.onPress}
          activeOpacity={0.7}
          disabled={loadingAction !== null}
        >
          <View style={styles.cardIcon}>
            <Ionicons name={option.icon} size={24} color={COLORS.primary} />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              {option.requiresPro && !hasFullExport && (
                <View style={styles.proBadge}>
                  <Ionicons name="star" size={10} color={COLORS.warning} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardDescription}>{option.description}</Text>
          </View>
          {loadingAction === option.id ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="share-outline" size={20} color={COLORS.gray400} />
          )}
        </TouchableOpacity>
      ))}

      <Text style={[styles.pageTitle, styles.sectionTitle]}>Backup & Restore</Text>
      <Text style={styles.pageSubtitle}>
        Create a full backup or restore from a previous one
      </Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => handleExport('backup', createDatabaseBackup, true)}
        activeOpacity={0.7}
        disabled={loadingAction !== null}
      >
        <View style={styles.cardIcon}>
          <Ionicons name="cloud-download-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Create Backup</Text>
            {!hasFullExport && (
              <View style={styles.proBadge}>
                <Ionicons name="star" size={10} color={COLORS.warning} />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>Complete backup as JSON file</Text>
        </View>
        {loadingAction === 'backup' ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="share-outline" size={20} color={COLORS.gray400} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={handleRestore}
        activeOpacity={0.7}
        disabled={loadingAction !== null}
      >
        <View style={styles.cardIcon}>
          <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Restore from Backup</Text>
            {!hasFullExport && (
              <View style={styles.proBadge}>
                <Ionicons name="star" size={10} color={COLORS.warning} />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>Replace current data with a backup file</Text>
        </View>
        {loadingAction === 'restore' ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="folder-open-outline" size={20} color={COLORS.gray400} />
        )}
      </TouchableOpacity>

      {!hasFullExport && (
        <TouchableOpacity
          style={styles.upgradeCard}
          onPress={() => navigation.navigate('Paywall', { feature: 'data_export' })}
          activeOpacity={0.8}
        >
          <Ionicons name="star" size={20} color={COLORS.warning} />
          <Text style={styles.upgradeText}>
            Upgrade to Pro for full export history, Excel, client/material exports, and backup/restore
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
        </TouchableOpacity>
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
  pageTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    marginTop: SPACING.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    gap: 3,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warning + '15',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.sm,
  },
  upgradeText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: '500',
  },
});
