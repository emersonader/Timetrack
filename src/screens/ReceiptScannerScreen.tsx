import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import { RootStackParamList, Client, CreateReceiptInput } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useReceipts, ReceiptWithClient } from '../hooks/useReceipts';
import { useClients } from '../hooks/useClients';
import { formatCurrency, formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'ReceiptScanner'>;

type ScreenMode = 'list' | 'camera' | 'detail';

const CATEGORIES = ['Materials', 'Fuel', 'Tools', 'Office', 'Travel', 'Food', 'Other'] as const;
type ReceiptCategory = typeof CATEGORIES[number];

const RECEIPTS_DIR = 'receipts/';

export function ReceiptScannerScreen({ navigation }: Props) {
  const { checkFeatureAccess } = useSubscription();
  const {
    receipts,
    stats,
    isLoading,
    addReceipt,
    updateReceipt,
    removeReceipt,
  } = useReceipts();
  const { clients } = useClients();

  // Screen mode
  const [mode, setMode] = useState<ScreenMode>('list');

  // Camera
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Detail / Edit form state
  const [editingReceipt, setEditingReceipt] = useState<ReceiptWithClient | null>(null);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [vendorName, setVendorName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<ReceiptCategory | ''>('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);

  // Pro gate
  useEffect(() => {
    if (!checkFeatureAccess('receipt_scanning')) {
      navigation.replace('Paywall', { feature: 'receipt_scanning' });
    }
  }, [checkFeatureAccess, navigation]);

  if (!checkFeatureAccess('receipt_scanning')) {
    return null;
  }

  // --- Helpers ---

  const ensureReceiptsDir = (): Directory => {
    const dir = new Directory(Paths.document, RECEIPTS_DIR);
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
    return dir;
  };

  const savePhotoToDocuments = (sourceUri: string): string => {
    const dir = ensureReceiptsDir();
    const filename = `receipt_${Date.now()}.jpg`;
    const source = new File(sourceUri);
    const dest = new File(dir, filename);
    source.copy(dest);
    return `${RECEIPTS_DIR}${filename}`;
  };

  const getFullPhotoUri = (relativePath: string): string => {
    return new File(Paths.document, relativePath).uri;
  };

  const resetForm = () => {
    setEditingReceipt(null);
    setPhotoUri('');
    setVendorName('');
    setTotalAmount('');
    setReceiptDate('');
    setNotes('');
    setCategory('');
    setSelectedClientId(null);
    setIsProcessed(false);
  };

  const openDetailForNewPhoto = (uri: string, relativePath: string) => {
    resetForm();
    setPhotoUri(relativePath);
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setMode('detail');
  };

  const openDetailForExisting = (receipt: ReceiptWithClient) => {
    setEditingReceipt(receipt);
    setPhotoUri(receipt.photo_path);
    setVendorName(receipt.vendor_name ?? '');
    setTotalAmount(receipt.total_amount != null ? String(receipt.total_amount) : '');
    setReceiptDate(receipt.date);
    setNotes(receipt.notes ?? '');
    setCategory((receipt.category as ReceiptCategory) ?? '');
    setSelectedClientId(receipt.client_id);
    setIsProcessed(receipt.is_processed === 1);
    setMode('detail');
  };

  // --- Camera ---

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan receipts.');
        return;
      }
    }
    setMode('camera');
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      const relativePath = await savePhotoToDocuments(photo.uri);
      openDetailForNewPhoto(photo.uri, relativePath);
    } catch (err) {
      console.error('Failed to take photo:', err);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  // --- Photo Library ---

  const handlePickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const relativePath = await savePhotoToDocuments(result.assets[0].uri);
      openDetailForNewPhoto(result.assets[0].uri, relativePath);
    } catch (err) {
      console.error('Failed to pick image:', err);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  // --- Save / Delete ---

  const handleSave = async () => {
    if (!photoUri) {
      Alert.alert('Required', 'A receipt photo is required.');
      return;
    }

    const amount = totalAmount.trim() ? parseFloat(totalAmount) : undefined;
    if (totalAmount.trim() && (isNaN(amount!) || amount! < 0)) {
      Alert.alert('Invalid', 'Please enter a valid amount.');
      return;
    }

    try {
      if (editingReceipt) {
        await updateReceipt(editingReceipt.id, {
          vendor_name: vendorName.trim() || undefined,
          total_amount: amount,
          date: receiptDate || new Date().toISOString().split('T')[0],
          notes: notes.trim() || undefined,
          category: category || undefined,
          client_id: selectedClientId ?? undefined,
          is_processed: isProcessed ? 1 : 0,
        });
      } else {
        const input: CreateReceiptInput = {
          photo_path: photoUri,
          date: receiptDate || new Date().toISOString().split('T')[0],
          vendor_name: vendorName.trim() || undefined,
          total_amount: amount,
          notes: notes.trim() || undefined,
          category: category || undefined,
          client_id: selectedClientId ?? undefined,
        };
        await addReceipt(input);
      }
      resetForm();
      setMode('list');
    } catch (err) {
      console.error('Failed to save receipt:', err);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    }
  };

  const handleDelete = () => {
    if (!editingReceipt) return;
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the photo file
              const photoFile = new File(Paths.document, editingReceipt.photo_path);
              if (photoFile.exists) {
                photoFile.delete();
              }
              await removeReceipt(editingReceipt.id);
              resetForm();
              setMode('list');
            } catch (err) {
              console.error('Failed to delete receipt:', err);
              Alert.alert('Error', 'Failed to delete receipt.');
            }
          },
        },
      ]
    );
  };

  // --- Render: Camera ---

  if (mode === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <TouchableOpacity
                style={styles.cameraCloseBtn}
                onPress={() => setMode('list')}
              >
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraBottomBar}>
              <TouchableOpacity
                style={styles.libraryBtn}
                onPress={() => {
                  setMode('list');
                  handlePickFromLibrary();
                }}
              >
                <Ionicons name="images-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureBtn}
                onPress={handleTakePhoto}
              >
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>

              <View style={{ width: 48 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // --- Render: Detail / Edit Form ---

  if (mode === 'detail') {
    const selectedClient = clients.find((c) => c.id === selectedClientId);

    return (
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.detailContent}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
          {/* Photo preview */}
          {photoUri ? (
            <Image
              source={{ uri: getFullPhotoUri(photoUri) }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : null}

          {/* Vendor name */}
          <Text style={styles.fieldLabel}>Vendor Name</Text>
          <TextInput
            style={styles.input}
            value={vendorName}
            onChangeText={setVendorName}
            placeholder="e.g. Home Depot"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Total amount */}
          <Text style={styles.fieldLabel}>Total Amount</Text>
          <TextInput
            style={styles.input}
            value={totalAmount}
            onChangeText={setTotalAmount}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Date */}
          <Text style={styles.fieldLabel}>Date</Text>
          <TextInput
            style={styles.input}
            value={receiptDate}
            onChangeText={setReceiptDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
          />

          {/* Category picker */}
          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={category ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
              {category || 'Select category'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.gray400} />
          </TouchableOpacity>

          {/* Category picker modal */}
          <Modal
            visible={showCategoryPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCategoryPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowCategoryPicker(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Category</Text>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.modalOption,
                      category === cat && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        category === cat && styles.modalOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                    {category === cat && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setCategory('');
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>None</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Client picker */}
          <Text style={styles.fieldLabel}>Client (optional)</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowClientPicker(true)}
          >
            <Text
              style={selectedClient ? styles.pickerBtnText : styles.pickerBtnPlaceholder}
            >
              {selectedClient
                ? `${selectedClient.first_name} ${selectedClient.last_name}`
                : 'Link to a client'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.gray400} />
          </TouchableOpacity>

          {/* Client picker modal */}
          <Modal
            visible={showClientPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowClientPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowClientPicker(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Client</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {clients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.modalOption,
                        selectedClientId === client.id && styles.modalOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedClientId(client.id);
                        setShowClientPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selectedClientId === client.id && styles.modalOptionTextSelected,
                        ]}
                      >
                        {client.first_name} {client.last_name}
                      </Text>
                      {selectedClientId === client.id && (
                        <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedClientId(null);
                    setShowClientPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>None</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Notes */}
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Mark as processed toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mark as Processed</Text>
            <Switch
              value={isProcessed}
              onValueChange={setIsProcessed}
              trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
              thumbColor={isProcessed ? COLORS.primary : COLORS.gray400}
            />
          </View>

          {/* Buttons */}
          <View style={styles.formBtnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                resetForm();
                setMode('list');
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {editingReceipt ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {editingReceipt && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.deleteBtnText}>Delete Receipt</Text>
            </TouchableOpacity>
          )}
      </KeyboardAwareScrollView>
    );
  }

  // --- Render: Receipt List ---

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Loading receipts..." />
      </View>
    );
  }

  const renderReceiptCard = ({ item }: { item: ReceiptWithClient }) => (
    <TouchableOpacity
      style={styles.receiptCard}
      onPress={() => openDetailForExisting(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getFullPhotoUri(item.photo_path) }}
        style={styles.thumbnail}
      />
      <View style={styles.receiptInfo}>
        <Text style={styles.receiptVendor} numberOfLines={1}>
          {item.vendor_name || 'Unnamed Receipt'}
        </Text>
        {item.total_amount != null && (
          <Text style={styles.receiptAmount}>
            {formatCurrency(item.total_amount)}
          </Text>
        )}
        <Text style={styles.receiptDate}>{formatDate(item.date)}</Text>
        {item.client_name && (
          <Text style={styles.receiptClient} numberOfLines={1}>
            {item.client_name}
          </Text>
        )}
      </View>
      <View style={styles.receiptMeta}>
        {item.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.statusDot,
            { backgroundColor: item.is_processed ? COLORS.success : COLORS.warning },
          ]}
        />
        <Text style={styles.statusText}>
          {item.is_processed ? 'Processed' : 'Pending'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Unprocessed banner */}
      {stats.unprocessedCount > 0 && (
        <View style={styles.banner}>
          <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
          <Text style={styles.bannerText}>
            {stats.unprocessedCount} unprocessed receipt{stats.unprocessedCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {receipts.length > 0 ? (
        <FlatList
          data={receipts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderReceiptCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No receipts</Text>
          <Text style={styles.emptyText}>
            Capture or import receipts to track your expenses
          </Text>
        </View>
      )}

      {/* FAB - Capture new receipt */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fabSecondary]}
          onPress={handlePickFromLibrary}
        >
          <Ionicons name="images-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenCamera}
        >
          <Ionicons name="camera-outline" size={26} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  bannerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.warningDark,
  },

  // Receipt card
  receiptCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray100,
  },
  receiptInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
    justifyContent: 'center',
  },
  receiptVendor: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  receiptAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  receiptDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  receiptClient: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.secondary,
    marginTop: 1,
  },
  receiptMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xs,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 10,
    color: COLORS.gray500,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.md,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  fabSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },

  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.md,
  },
  cameraCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  libraryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.white,
  },

  // Detail / Edit form
  detailContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray100,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: SPACING.sm,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
  },
  pickerBtnText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  pickerBtnPlaceholder: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  // Form buttons
  formBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  deleteBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.error,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.md,
  },
  modalOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  modalOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
