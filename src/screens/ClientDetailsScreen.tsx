import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SectionList,
  Linking,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, GroupedSessions, SessionWithBillable, Material, FREE_TIER_LIMITS } from '../types';
import { useClient } from '../hooks/useClients';
import { useGroupedSessions, useSessionMutations } from '../hooks/useSessions';
import { useTimer } from '../hooks/useTimer';
import { useMaterials, useMaterialMutations } from '../hooks/useMaterials';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import {
  formatFullName,
  formatPhoneNumber,
  formatCurrency,
  formatDuration,
  formatDurationHuman,
  formatDate,
  getInitials,
} from '../utils/formatters';
import { Button } from '../components/Button';
import { TimeSessionCard, SessionGroupHeader } from '../components/TimeSessionCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { openPhoneDialer, openEmailClient } from '../services/shareService';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientDetails'>;

export function ClientDetailsScreen({ route, navigation }: Props) {
  const { clientId } = route.params;
  const { client, isLoading: isLoadingClient, refresh: refreshClient } = useClient(clientId);
  const {
    groupedSessions,
    isLoading: isLoadingSessions,
    refresh: refreshSessions,
  } = useGroupedSessions(clientId);
  const { deleteSession, addManualSession } = useSessionMutations();
  const { timerState, activeClient, startTimer, stopTimer } = useTimer();
  const { materials, totalCost: totalMaterialCost, refresh: refreshMaterials } = useMaterials(clientId);
  const { addMaterial, removeMaterial } = useMaterialMutations();
  const { canAddMoreMaterials } = useSubscription();

  // State for adding new material
  const [materialName, setMaterialName] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // State for adding manual time
  const [showAddTime, setShowAddTime] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');

  // Ref for ScrollView to scroll to focused input
  const scrollViewRef = useRef<ScrollView>(null);

  const isTimerActiveForClient =
    timerState.isRunning && timerState.clientId === clientId;
  const isTimerActiveForOtherClient =
    timerState.isRunning && timerState.clientId !== clientId;

  // Refresh data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshClient();
      refreshSessions();
      refreshMaterials();
    }, [refreshClient, refreshSessions, refreshMaterials])
  );

  const handleStartTimer = async () => {
    if (isTimerActiveForOtherClient && activeClient) {
      Alert.alert(
        'Timer Running',
        `You have an active timer for ${formatFullName(activeClient.first_name, activeClient.last_name)}. Would you like to stop it and start a new one?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop & Start New',
            onPress: async () => {
              await stopTimer();
              await startTimer(clientId);
              refreshSessions();
            },
          },
        ]
      );
    } else {
      await startTimer(clientId);
    }
  };

  const handleStopTimer = async () => {
    await stopTimer();
    refreshSessions();
  };

  const handleEditClient = () => {
    navigation.navigate('EditClient', { clientId });
  };

  const handleSendInvoice = () => {
    navigation.navigate('SendInvoice', { clientId });
  };

  const handleDeleteSession = (sessionId: number) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this time session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            refreshSessions();
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    if (client?.phone) {
      openPhoneDialer(client.phone);
    }
  };

  const handleEmailClient = () => {
    if (client?.email) {
      openEmailClient(client.email);
    }
  };

  const handleGetDirections = () => {
    if (client?.street) {
      const address = `${client.street}, ${client.city}, ${client.state} ${client.zip_code}`;
      const encodedAddress = encodeURIComponent(address);

      // Use Apple Maps on iOS, Google Maps on Android
      const url = Platform.select({
        ios: `maps://app?daddr=${encodedAddress}`,
        android: `google.navigation:q=${encodedAddress}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
      });

      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web if native app fails
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`);
      });
    }
  };

  const handleAddMaterial = async () => {
    if (!materialName.trim()) {
      Alert.alert('Error', 'Please enter a material name');
      return;
    }
    const cost = parseFloat(materialCost) || 0;
    if (cost < 0) {
      Alert.alert('Error', 'Cost cannot be negative');
      return;
    }

    try {
      await addMaterial({
        client_id: clientId,
        name: materialName.trim(),
        cost,
      });
      setMaterialName('');
      setMaterialCost('');
      setShowAddMaterial(false);
      refreshMaterials();
    } catch (error) {
      Alert.alert('Error', 'Failed to add material');
    }
  };

  const handleDeleteMaterial = (material: Material) => {
    Alert.alert(
      'Delete Material',
      `Are you sure you want to delete "${material.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeMaterial(material.id);
            refreshMaterials();
          },
        },
      ]
    );
  };

  const handleAddManualTime = async () => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;

    if (hours === 0 && minutes === 0) {
      Alert.alert('Error', 'Please enter hours or minutes');
      return;
    }

    const totalSeconds = (hours * 3600) + (minutes * 60);

    try {
      await addManualSession(clientId, totalSeconds);
      setManualHours('');
      setManualMinutes('');
      setShowAddTime(false);
      refreshSessions();
    } catch (error) {
      Alert.alert('Error', 'Failed to add time entry');
    }
  };

  // Calculate totals
  const totalDuration = groupedSessions.reduce(
    (sum, group) => sum + group.totalDuration,
    0
  );
  const totalBillable = groupedSessions.reduce(
    (sum, group) => sum + group.totalBillable,
    0
  );

  if (isLoadingClient) {
    return <LoadingSpinner fullScreen message="Loading client..." />;
  }

  if (!client) {
    return (
      <EmptyState
        icon="person-outline"
        title="Client Not Found"
        message="This client may have been deleted"
        actionLabel="Go Back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  const initials = getInitials(client.first_name, client.last_name);
  const fullName = formatFullName(client.first_name, client.last_name);

  const content = (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Client Info Card */}
      <View style={styles.clientCard}>
        <View style={styles.clientHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{fullName}</Text>
            <Text style={styles.clientRate}>
              {formatCurrency(client.hourly_rate)}/hr
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditClient}
          >
            <Ionicons name="pencil" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.clientDetails}>
          <TouchableOpacity
            style={styles.detailRow}
            onPress={handleCallClient}
          >
            <Ionicons name="call-outline" size={18} color={COLORS.gray500} />
            <Text style={styles.detailText}>
              {formatPhoneNumber(client.phone)}
            </Text>
          </TouchableOpacity>

          {client.email && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={handleEmailClient}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.gray500} />
              <Text style={styles.detailText}>{client.email}</Text>
            </TouchableOpacity>
          )}

          {client.street && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={handleGetDirections}
            >
              <Ionicons
                name="navigate-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={[styles.detailText, styles.linkText]}>
                {`${client.street}, ${client.city}, ${client.state} ${client.zip_code}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Timer Section */}
      <View style={styles.timerSection}>
        {isTimerActiveForClient ? (
          <>
            <View style={styles.timerDisplay}>
              <View style={styles.timerDot} />
              <Text style={styles.timerTime}>
                {formatDuration(timerState.elapsedSeconds)}
              </Text>
            </View>
            <Button
              title="Stop Timer"
              onPress={handleStopTimer}
              variant="danger"
              fullWidth
              icon={<Ionicons name="stop" size={20} color={COLORS.white} />}
            />
          </>
        ) : (
          <Button
            title="Start Timer"
            onPress={handleStartTimer}
            variant="success"
            fullWidth
            disabled={isTimerActiveForOtherClient}
            icon={<Ionicons name="play" size={20} color={COLORS.white} />}
          />
        )}

        <Button
          title="Send Invoice"
          onPress={handleSendInvoice}
          variant="primary"
          fullWidth
          style={styles.invoiceButton}
          icon={
            <Ionicons name="document-text" size={20} color={COLORS.white} />
          }
        />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color={COLORS.primary} />
          <Text style={styles.statValue}>
            {formatDurationHuman(totalDuration)}
          </Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={24} color={COLORS.success} />
          <Text style={styles.statValue}>{formatCurrency(totalBillable + totalMaterialCost)}</Text>
          <Text style={styles.statLabel}>Total Amount</Text>
        </View>
      </View>

      {/* Materials Section */}
      <View style={styles.materialsSection}>
        <View style={styles.materialHeader}>
          <Text style={styles.sectionTitle}>Materials & Costs</Text>
          <TouchableOpacity
            style={styles.addMaterialButton}
            onPress={() => {
              if (showAddMaterial) {
                setShowAddMaterial(false);
              } else if (canAddMoreMaterials(materials.length)) {
                setShowAddMaterial(true);
              } else {
                navigation.navigate('Paywall', { feature: 'unlimited_materials' });
              }
            }}
          >
            <Ionicons
              name={showAddMaterial ? 'close' : (canAddMoreMaterials(materials.length) ? 'add' : 'lock-closed')}
              size={24}
              color={canAddMoreMaterials(materials.length) ? COLORS.primary : COLORS.gray400}
            />
          </TouchableOpacity>
        </View>

        {/* Material limit warning */}
        {!canAddMoreMaterials(materials.length) && !showAddMaterial && (
          <TouchableOpacity
            style={styles.limitWarning}
            onPress={() => navigation.navigate('Paywall', { feature: 'unlimited_materials' })}
          >
            <Ionicons name="information-circle" size={18} color={COLORS.warning} />
            <Text style={styles.limitWarningText}>
              Free plan limit: {FREE_TIER_LIMITS.maxMaterialsPerClient} materials per client
            </Text>
            <Text style={styles.upgradeLink}>Upgrade</Text>
          </TouchableOpacity>
        )}

        {showAddMaterial && (
          <View style={styles.addMaterialForm}>
            <TextInput
              style={styles.materialInput}
              placeholder="Material name"
              value={materialName}
              onChangeText={setMaterialName}
              placeholderTextColor={COLORS.gray400}
            />
            <View style={styles.costInputRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.materialInput, styles.costInput]}
                placeholder="0.00"
                value={materialCost}
                onChangeText={setMaterialCost}
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.gray400}
              />
              <TouchableOpacity
                style={styles.saveMaterialButton}
                onPress={handleAddMaterial}
              >
                <Ionicons name="checkmark" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {materials.length === 0 ? (
          <View style={styles.emptyMaterialsCard}>
            <Ionicons name="construct-outline" size={32} color={COLORS.gray300} />
            <Text style={styles.emptyMaterialsText}>
              No materials added yet. Tap + to add materials and costs.
            </Text>
          </View>
        ) : (
          <>
            {materials.map((material) => (
              <View key={material.id} style={styles.materialItem}>
                <View style={styles.materialInfo}>
                  <Text style={styles.materialName}>{material.name}</Text>
                </View>
                <Text style={styles.materialCost}>{formatCurrency(material.cost)}</Text>
                <TouchableOpacity
                  style={styles.deleteMaterialButton}
                  onPress={() => handleDeleteMaterial(material)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.materialTotalRow}>
              <Text style={styles.materialTotalLabel}>Materials Total</Text>
              <Text style={styles.materialTotalValue}>{formatCurrency(totalMaterialCost)}</Text>
            </View>
          </>
        )}
      </View>

      {/* Session History */}
      <View style={styles.sessionsSection}>
        <View style={styles.materialHeader}>
          <Text style={styles.sectionTitle}>Time Sessions</Text>
          <TouchableOpacity
            style={styles.addMaterialButton}
            onPress={() => setShowAddTime(!showAddTime)}
          >
            <Ionicons
              name={showAddTime ? 'close' : 'add'}
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {showAddTime && (
          <View style={styles.addMaterialForm}>
            <Text style={styles.addTimeLabel}>Add Manual Time Entry</Text>
            <View style={styles.timeInputRow}>
              <View style={styles.timeInputGroup}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="0"
                  value={manualHours}
                  onChangeText={setManualHours}
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.gray400}
                />
                <Text style={styles.timeInputLabel}>Hours</Text>
              </View>
              <View style={styles.timeInputGroup}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="0"
                  value={manualMinutes}
                  onChangeText={setManualMinutes}
                  keyboardType="number-pad"
                  placeholderTextColor={COLORS.gray400}
                  maxLength={2}
                />
                <Text style={styles.timeInputLabel}>Minutes</Text>
              </View>
              <TouchableOpacity
                style={styles.saveMaterialButton}
                onPress={handleAddManualTime}
              >
                <Ionicons name="checkmark" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoadingSessions ? (
          <LoadingSpinner size="small" message="Loading sessions..." />
        ) : groupedSessions.length === 0 ? (
          <View style={styles.emptySessionsCard}>
            <Ionicons name="time-outline" size={32} color={COLORS.gray300} />
            <Text style={styles.emptySessionsText}>
              No time sessions yet. Start the timer or add time manually!
            </Text>
          </View>
        ) : (
          groupedSessions.map((group) => (
            <View key={group.date}>
              <SessionGroupHeader
                date={group.date}
                totalDuration={group.totalDuration}
                totalBillable={group.totalBillable}
              />
              {group.sessions.map((session) => (
                <TimeSessionCard
                  key={session.id}
                  session={session}
                  onDelete={
                    !session.is_active
                      ? () => handleDeleteSession(session.id)
                      : undefined
                  }
                />
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Only wrap with KeyboardAvoidingView on iOS
  // Android handles keyboard avoidance automatically in Expo Go
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={120}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={styles.flex}>{content}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 150,
  },

  // Client Card
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clientRate: {
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
    fontWeight: '500',
  },
  editButton: {
    padding: SPACING.sm,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.full,
  },
  clientDetails: {
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray600,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },

  // Timer Section
  timerSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  timerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  timerTime: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  invoiceButton: {
    marginTop: SPACING.sm,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
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
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },

  // Materials
  materialsSection: {
    marginBottom: SPACING.md,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addMaterialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMaterialForm: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  limitWarningText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
  },
  upgradeLink: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  materialInput: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  costInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray500,
    marginRight: SPACING.xs,
  },
  costInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: SPACING.sm,
  },
  saveMaterialButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMaterialsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyMaterialsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    ...SHADOWS.sm,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  materialCost: {
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  deleteMaterialButton: {
    padding: SPACING.xs,
  },
  materialTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    marginTop: SPACING.xs,
  },
  materialTotalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  materialTotalValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.success,
  },

  // Manual Time Entry
  addTimeLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputGroup: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  timeInput: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  timeInputLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },

  // Sessions
  sessionsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  emptySessionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptySessionsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
