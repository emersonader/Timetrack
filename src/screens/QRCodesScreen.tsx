import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import QRCodeSVG from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RootStackParamList, Client, CreateQRCodeInput } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTimer } from '../context/TimerContext';
import { useQRCodes } from '../hooks/useQRCodes';
import { getAllClients } from '../db/clientRepository';
import { findQRCodeByData } from '../db/qrCodeRepository';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'QRCodes'>;

type TabMode = 'codes' | 'scan' | 'generate';

export function QRCodesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { checkFeatureAccess } = useSubscription();
  const { startTimer } = useTimer();
  const { qrCodes, isLoading, error, createCode, deleteCode, refreshCodes } = useQRCodes();

  const [activeTab, setActiveTab] = useState<TabMode>('codes');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Client list for selection
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Create form state
  const [formClientId, setFormClientId] = useState<number | null>(null);
  const [formClientSearch, setFormClientSearch] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Generate tab state
  const [genClientId, setGenClientId] = useState<number | null>(null);
  const [genClientSearch, setGenClientSearch] = useState('');
  const [genLabel, setGenLabel] = useState('');
  const [genPreviewData, setGenPreviewData] = useState<string | null>(null);
  const [showGenClientDropdown, setShowGenClientDropdown] = useState(false);

  // Scan state
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [scanProcessing, setScanProcessing] = useState(false);

  // Check feature access on mount
  useEffect(() => {
    if (!checkFeatureAccess('qr_codes')) {
      navigation.navigate('Paywall', { feature: 'qr_codes' });
    }
  }, [checkFeatureAccess, navigation]);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        setClientsLoading(true);
        const result = await getAllClients();
        setClients(result);
      } catch (err) {
        console.error('Error loading clients:', err);
      } finally {
        setClientsLoading(false);
      }
    };
    loadClients();
  }, []);

  // Filtered clients for create form
  const filteredClients = useMemo(() => {
    if (!formClientSearch.trim()) return clients;
    const search = formClientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.first_name.toLowerCase().includes(search) ||
        c.last_name.toLowerCase().includes(search)
    );
  }, [clients, formClientSearch]);

  // Filtered clients for generate tab
  const filteredGenClients = useMemo(() => {
    if (!genClientSearch.trim()) return clients;
    const search = genClientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.first_name.toLowerCase().includes(search) ||
        c.last_name.toLowerCase().includes(search)
    );
  }, [clients, genClientSearch]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === formClientId) ?? null,
    [clients, formClientId]
  );

  const selectedGenClient = useMemo(
    () => clients.find((c) => c.id === genClientId) ?? null,
    [clients, genClientId]
  );

  // ─── Create form handlers ─────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setFormClientId(null);
    setFormClientSearch('');
    setFormLabel('');
    setShowClientDropdown(false);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formClientId) {
      Alert.alert('Required', 'Please select a client.');
      return;
    }
    if (!formLabel.trim()) {
      Alert.alert('Required', 'Please enter a label for this QR code.');
      return;
    }

    try {
      const input: CreateQRCodeInput = {
        client_id: formClientId,
        label: formLabel.trim(),
      };
      await createCode(input);
      setShowCreateForm(false);
      resetCreateForm();
    } catch {
      Alert.alert('Error', 'Failed to create QR code.');
    }
  }, [formClientId, formLabel, createCode, resetCreateForm]);

  const handleDelete = useCallback(
    (id: number, label: string) => {
      Alert.alert('Delete QR Code', `Are you sure you want to delete "${label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCode(id);
            } catch {
              Alert.alert('Error', 'Failed to delete QR code.');
            }
          },
        },
      ]);
    },
    [deleteCode]
  );

  // ─── Scan handlers ─────────────────────────────────────────────

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanProcessing || scannedData) return;
      setScanProcessing(true);
      setScannedData(data);

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'hourflow_checkin' && parsed.client_id) {
          const matchedCode = await findQRCodeByData(data);
          const client = clients.find((c) => c.id === parsed.client_id);
          const clientName = client
            ? `${client.first_name} ${client.last_name}`
            : `Client #${parsed.client_id}`;

          Alert.alert(
            'HourFlow Check-In',
            `Start timer for ${clientName}?${matchedCode ? `\nLabel: ${matchedCode.label}` : ''}`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setScannedData(null);
                  setScanProcessing(false);
                },
              },
              {
                text: 'Start Timer',
                onPress: async () => {
                  try {
                    await startTimer(parsed.client_id);
                    navigation.goBack();
                  } catch (err) {
                    Alert.alert('Error', 'Failed to start timer.');
                    setScannedData(null);
                    setScanProcessing(false);
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Unknown QR Code', 'This QR code is not an HourFlow check-in code.', [
            {
              text: 'OK',
              onPress: () => {
                setScannedData(null);
                setScanProcessing(false);
              },
            },
          ]);
        }
      } catch {
        Alert.alert('Invalid QR Code', 'Could not read the QR code data.', [
          {
            text: 'OK',
            onPress: () => {
              setScannedData(null);
              setScanProcessing(false);
            },
          },
        ]);
      }
    },
    [scanProcessing, scannedData, clients, startTimer, navigation]
  );

  // ─── Generate tab handlers ─────────────────────────────────────

  const handleGeneratePreview = useCallback(() => {
    if (!genClientId || !genLabel.trim()) return;
    const data = JSON.stringify({
      type: 'hourflow_checkin',
      client_id: genClientId,
      label: genLabel.trim(),
      created_at: new Date().toISOString(),
    });
    setGenPreviewData(data);
  }, [genClientId, genLabel]);

  const handleSaveGenerated = useCallback(async () => {
    if (!genClientId || !genLabel.trim()) {
      Alert.alert('Required', 'Please select a client and enter a label.');
      return;
    }

    try {
      const input: CreateQRCodeInput = {
        client_id: genClientId,
        label: genLabel.trim(),
      };
      await createCode(input);
      Alert.alert('Saved', 'QR code has been saved.');
      setGenClientId(null);
      setGenClientSearch('');
      setGenLabel('');
      setGenPreviewData(null);
      setShowGenClientDropdown(false);
      setActiveTab('codes');
    } catch {
      Alert.alert('Error', 'Failed to save QR code.');
    }
  }, [genClientId, genLabel, createCode]);

  // ─── Render helpers ────────────────────────────────────────────

  const renderQRCodeCard = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardClient}>
              {item.client_first_name} {item.client_last_name}
            </Text>
          </View>
          <View style={styles.cardQRPreview}>
            <QRCodeSVG value={item.code_data} size={100} />
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id, item.label)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    ),
    [handleDelete]
  );

  const renderClientDropdown = (
    filteredList: Client[],
    onSelect: (client: Client) => void,
    onClose: () => void
  ) => (
    <View style={styles.dropdownContainer}>
      {filteredList.length === 0 ? (
        <Text style={styles.dropdownEmpty}>No clients found</Text>
      ) : (
        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
          {filteredList.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(client);
                onClose();
              }}
            >
              <Text style={styles.dropdownItemText}>
                {client.first_name} {client.last_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ─── Tab content ───────────────────────────────────────────────

  const renderCodesTab = () => {
    if (isLoading) {
      return <LoadingSpinner fullScreen message="Loading QR codes..." />;
    }

    if (qrCodes.length === 0) {
      return (
        <EmptyState
          icon="qr-code-outline"
          title="No QR codes yet"
          message="Create QR codes for quick client check-ins. Scan them to start a timer instantly."
          actionLabel="Create QR Code"
          onAction={() => setShowCreateForm(true)}
        />
      );
    }

    return (
      <FlatList
        data={qrCodes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderQRCodeCard}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  const renderScanTab = () => {
    if (!permission) {
      return <LoadingSpinner fullScreen message="Checking camera permissions..." />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.gray400} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionMessage}>
            Grant camera permission to scan QR codes for quick check-in.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scanContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>
            {scannedData ? 'Processing...' : 'Point camera at an HourFlow QR code'}
          </Text>
        </View>
        {scannedData && (
          <View style={styles.scannedOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.scannedText}>Reading QR code...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderGenerateTab = () => (
    <ScrollView style={styles.generateScroll} contentContainerStyle={styles.generateContent}>
      {/* Client Selector */}
      <Text style={styles.formLabel}>Client</Text>
      <TextInput
        style={styles.input}
        placeholder="Search for a client..."
        placeholderTextColor={COLORS.gray400}
        value={selectedGenClient ? `${selectedGenClient.first_name} ${selectedGenClient.last_name}` : genClientSearch}
        onChangeText={(text) => {
          setGenClientSearch(text);
          setGenClientId(null);
          setGenPreviewData(null);
          setShowGenClientDropdown(true);
        }}
        onFocus={() => setShowGenClientDropdown(true)}
      />
      {showGenClientDropdown &&
        renderClientDropdown(
          filteredGenClients,
          (client) => {
            setGenClientId(client.id);
            setGenClientSearch(`${client.first_name} ${client.last_name}`);
            setGenPreviewData(null);
          },
          () => setShowGenClientDropdown(false)
        )}

      {/* Label */}
      <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Label</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Front Door, Job Site A"
        placeholderTextColor={COLORS.gray400}
        value={genLabel}
        onChangeText={(text) => {
          setGenLabel(text);
          setGenPreviewData(null);
        }}
      />

      {/* Preview / Generate Button */}
      {genClientId && genLabel.trim() ? (
        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: SPACING.lg }]}
          onPress={handleGeneratePreview}
        >
          <Ionicons name="qr-code-outline" size={20} color={COLORS.white} />
          <Text style={styles.primaryButtonText}>
            {genPreviewData ? 'Regenerate Preview' : 'Generate Preview'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.disabledButton, { marginTop: SPACING.lg }]}>
          <Ionicons name="qr-code-outline" size={20} color={COLORS.gray400} />
          <Text style={styles.disabledButtonText}>Select client and enter label</Text>
        </View>
      )}

      {/* QR Code Preview */}
      {genPreviewData && (
        <View style={styles.previewContainer}>
          <View style={styles.previewQR}>
            <QRCodeSVG value={genPreviewData} size={250} />
          </View>
          <Text style={styles.previewLabel}>{genLabel}</Text>
          <Text style={styles.previewClient}>
            {selectedGenClient?.first_name} {selectedGenClient?.last_name}
          </Text>

          <TouchableOpacity
            style={[styles.saveButton, { marginTop: SPACING.lg }]}
            onPress={handleSaveGenerated}
          >
            <Ionicons name="save-outline" size={20} color={COLORS.white} />
            <Text style={styles.saveButtonText}>Save QR Code</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'codes' && styles.tabActive]}
          onPress={() => setActiveTab('codes')}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={activeTab === 'codes' ? COLORS.primary : COLORS.gray400}
          />
          <Text style={[styles.tabText, activeTab === 'codes' && styles.tabTextActive]}>
            My QR Codes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'scan' && styles.tabActive]}
          onPress={() => setActiveTab('scan')}
        >
          <Ionicons
            name="scan-outline"
            size={18}
            color={activeTab === 'scan' ? COLORS.primary : COLORS.gray400}
          />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
            Scan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'generate' && styles.tabActive]}
          onPress={() => setActiveTab('generate')}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={activeTab === 'generate' ? COLORS.primary : COLORS.gray400}
          />
          <Text style={[styles.tabText, activeTab === 'generate' && styles.tabTextActive]}>
            Generate
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'codes' && renderCodesTab()}
        {activeTab === 'scan' && renderScanTab()}
        {activeTab === 'generate' && renderGenerateTab()}
      </View>

      {/* FAB for codes tab */}
      {activeTab === 'codes' && qrCodes.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Create Modal */}
      <Modal visible={showCreateForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowCreateForm(false);
                resetCreateForm();
              }}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New QR Code</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={styles.modalSave}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            {/* Client Selector */}
            <Text style={styles.formLabel}>Client</Text>
            <TextInput
              style={styles.input}
              placeholder="Search for a client..."
              placeholderTextColor={COLORS.gray400}
              value={
                selectedClient
                  ? `${selectedClient.first_name} ${selectedClient.last_name}`
                  : formClientSearch
              }
              onChangeText={(text) => {
                setFormClientSearch(text);
                setFormClientId(null);
                setShowClientDropdown(true);
              }}
              onFocus={() => setShowClientDropdown(true)}
            />
            {showClientDropdown &&
              renderClientDropdown(
                filteredClients,
                (client) => {
                  setFormClientId(client.id);
                  setFormClientSearch(`${client.first_name} ${client.last_name}`);
                },
                () => setShowClientDropdown(false)
              )}

            {/* Label */}
            <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Label</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Front Door, Job Site A"
              placeholderTextColor={COLORS.gray400}
              value={formLabel}
              onChangeText={setFormLabel}
            />

            {clientsLoading && (
              <ActivityIndicator
                style={{ marginTop: SPACING.md }}
                size="small"
                color={COLORS.primary}
              />
            )}

            <View style={{ height: SPACING.xxl }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray400,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.errorLight + '20',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.errorLight,
  },
  errorBannerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
  },

  // QR code list
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  cardLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardClient: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardQRPreview: {
    padding: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  deleteBtnText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    fontWeight: '500',
  },

  // Scan tab
  scanContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'transparent',
  },
  scanHint: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    fontWeight: '600',
  },

  // Camera permission
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  permissionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  permissionMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Generate tab
  generateScroll: {
    flex: 1,
  },
  generateContent: {
    padding: SPACING.md,
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  previewQR: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
  },
  previewLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  previewClient: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.gray200,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
  },
  disabledButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.gray400,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Form / Modal
  formLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm + 2,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.xs,
    maxHeight: 200,
    ...SHADOWS.sm,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dropdownItemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  dropdownEmpty: {
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalCancel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalSave: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: SPACING.md,
  },
});
