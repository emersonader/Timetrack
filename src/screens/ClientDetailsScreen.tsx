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
  Modal,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
import { PhotoGallery } from '../components/PhotoGallery';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';
import { usePhotos, usePhotoMutations } from '../hooks/usePhotos';
import { useVoiceNotes, useVoiceNoteMutations, useVoiceNotePlayer } from '../hooks/useVoiceNotes';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { openPhoneDialer, openEmailClient } from '../services/shareService';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TemplatePicker } from '../components/TemplatePicker';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientDetails'>;

export function ClientDetailsScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { clientId } = route.params;
  const { client, isLoading: isLoadingClient, refresh: refreshClient } = useClient(clientId);
  const {
    groupedSessions,
    isLoading: isLoadingSessions,
    refresh: refreshSessions,
  } = useGroupedSessions(clientId);
  const { deleteSession, addManualSession, clearAllSessions } = useSessionMutations();
  const { timerState, activeClient, startTimer, stopTimer } = useTimer();
  const { materials, totalCost: totalMaterialCost, refresh: refreshMaterials } = useMaterials(clientId);
  const { addMaterial, removeMaterial, clearAllMaterials } = useMaterialMutations();
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const { photos, refresh: refreshPhotos } = usePhotos(expandedSessionId);
  const { addFromGallery, addFromCamera, removePhoto, isLoading: isPhotoLoading } = usePhotoMutations();
  const { voiceNotes, refresh: refreshVoiceNotes } = useVoiceNotes(expandedSessionId);
  const { startRecord, stopAndSave, removeNote, isRecording, isLoading: isVoiceNoteLoading } = useVoiceNoteMutations();
  const voicePlayer = useVoiceNotePlayer();
  const { canAddMoreMaterials, checkFeatureAccess } = useSubscription();

  // State for adding new material
  const [materialName, setMaterialName] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // State for adding manual time
  const [showAddTime, setShowAddTime] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // State for stop timer notes dialog
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

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
        t('clientDetails.timerRunning'),
        t('clientDetails.timerRunningMessage', { client: formatFullName(activeClient.first_name, activeClient.last_name) }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('clientDetails.stopAndStartNew'),
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

  const handleStopTimer = () => {
    // Show the notes dialog instead of stopping immediately
    setShowNotesDialog(true);
  };

  const handleConfirmStopTimer = async (withNotes: boolean) => {
    const notes = withNotes ? sessionNotes.trim() : undefined;
    await stopTimer(notes || undefined);
    setShowNotesDialog(false);
    setSessionNotes('');
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
      t('clientDetails.deleteSession'),
      t('clientDetails.deleteSessionConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            refreshSessions();
          },
        },
      ]
    );
  };

  const handleEditSession = (sessionId: number) => {
    navigation.navigate('EditSession', { sessionId, clientId });
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
      Alert.alert(t('common.error'), t('clientDetails.enterMaterialName'));
      return;
    }
    const cost = parseFloat(materialCost) || 0;
    if (cost < 0) {
      Alert.alert(t('common.error'), t('clientDetails.costCannotBeNegative'));
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
      Alert.alert(t('common.error'), t('clientDetails.failedToAddMaterial'));
    }
  };

  const handleDeleteMaterial = (material: Material) => {
    Alert.alert(
      t('clientDetails.deleteMaterial'),
      t('clientDetails.deleteMaterialConfirm', { name: material.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
      Alert.alert(t('common.error'), t('clientDetails.enterHoursOrMinutes'));
      return;
    }

    const totalSeconds = (hours * 3600) + (minutes * 60);
    const notes = manualNotes.trim() || undefined;

    try {
      await addManualSession(clientId, totalSeconds, undefined, notes);
      setManualHours('');
      setManualMinutes('');
      setManualNotes('');
      setShowAddTime(false);
      refreshSessions();
    } catch (error) {
      Alert.alert(t('common.error'), t('clientDetails.failedToAddTime'));
    }
  };

  const handleMarkAsPaid = () => {
    const hasData = groupedSessions.length > 0 || materials.length > 0;
    if (!hasData) {
      Alert.alert(t('clientDetails.nothingToClear'), t('clientDetails.noDataToClear'));
      return;
    }

    Alert.alert(
      t('clientDetails.markAsPaid'),
      t('clientDetails.markAsPaidWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('clientDetails.clearAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([
                clearAllSessions(clientId),
                clearAllMaterials(clientId),
              ]);
              refreshSessions();
              refreshMaterials();
              Alert.alert(t('common.success'), t('clientDetails.allItemsCleared'));
            } catch (error) {
              Alert.alert(t('common.error'), t('clientDetails.failedToClear'));
            }
          },
        },
      ]
    );
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
    <KeyboardAwareScrollView
      innerRef={(ref: any) => { scrollViewRef.current = ref; }}
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid={true}
      extraScrollHeight={20}
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
              {formatCurrency(client.hourly_rate, client.currency)}/hr
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

          {/* GPS Auto Clock-in */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => {
              if (checkFeatureAccess('geofencing')) {
                navigation.navigate('Geofences', { clientId });
              } else {
                navigation.navigate('Paywall', { feature: 'geofencing' });
              }
            }}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={[styles.detailText, styles.linkText]}>
              {t('clientDetails.setGpsClockIn')}
            </Text>
          </TouchableOpacity>
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
              title={t('clientDetails.stopTimer')}
              onPress={handleStopTimer}
              variant="danger"
              fullWidth
              icon={<Ionicons name="stop" size={20} color={COLORS.white} />}
            />
          </>
        ) : (
          <Button
            title={t('clientDetails.startTimer')}
            onPress={handleStartTimer}
            variant="success"
            fullWidth
            disabled={isTimerActiveForOtherClient}
            icon={<Ionicons name="play" size={20} color={COLORS.white} />}
          />
        )}

        <Button
          title={t('clientDetails.sendInvoice')}
          onPress={handleSendInvoice}
          variant="primary"
          fullWidth
          style={styles.invoiceButton}
          icon={
            <Ionicons name="document-text" size={20} color={COLORS.white} />
          }
        />
        <Button
          title={t('clientDetails.markAsPaid')}
          onPress={handleMarkAsPaid}
          variant="outline"
          fullWidth
          style={styles.markPaidButton}
          icon={
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
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
          <Text style={styles.statLabel}>{t('clientDetails.totalTime')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={24} color={COLORS.success} />
          <Text style={styles.statValue}>{formatCurrency(totalBillable + totalMaterialCost, client.currency)}</Text>
          <Text style={styles.statLabel}>{t('clientDetails.totalAmount')}</Text>
        </View>
      </View>

      {/* Materials Section */}
      <View style={styles.materialsSection}>
        <View style={styles.materialHeader}>
          <Text style={styles.sectionTitle}>{t('clientDetails.materialsAndCosts')}</Text>
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
                <Text style={styles.materialCost}>{formatCurrency(material.cost, client.currency)}</Text>
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
              <Text style={styles.materialTotalValue}>{formatCurrency(totalMaterialCost, client.currency)}</Text>
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
            <Text style={styles.addTimeLabel}>{t('clientDetails.addManualTimeEntry')}</Text>
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
                <Text style={styles.timeInputLabel}>{t('clientDetails.hours')}</Text>
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
                <Text style={styles.timeInputLabel}>{t('clientDetails.minutes')}</Text>
              </View>
              <TouchableOpacity
                style={styles.saveMaterialButton}
                onPress={handleAddManualTime}
              >
                <Ionicons name="checkmark" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder={t('clientDetails.jobNotesOptional')}
              value={manualNotes}
              onChangeText={setManualNotes}
              placeholderTextColor={COLORS.gray400}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={styles.useTemplateButton}
              onPress={() => setShowTemplatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="clipboard-outline" size={18} color={COLORS.primary} />
              <Text style={styles.useTemplateButtonText}>{t('clientDetails.useTemplate')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TemplatePicker
          visible={showTemplatePicker}
          onClose={() => setShowTemplatePicker(false)}
          onSelect={async (template, materials, addMaterials) => {
            setShowTemplatePicker(false);
            const totalSecs = template.estimated_duration_seconds;
            const hrs = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            setManualHours(String(hrs));
            setManualMinutes(String(mins));
            setManualNotes(template.default_notes || template.title);
            if (addMaterials && materials.length > 0) {
              for (const mat of materials) {
                await addMaterial({
                  client_id: clientId,
                  name: mat.name,
                  cost: mat.cost,
                });
              }
              refreshMaterials();
            }
          }}
        />

        {isLoadingSessions ? (
          <LoadingSpinner size="small" message={t('clientDetails.loadingSessions')} />
        ) : groupedSessions.length === 0 ? (
          <View style={styles.emptySessionsCard}>
            <Ionicons name="time-outline" size={32} color={COLORS.gray300} />
            <Text style={styles.emptySessionsText}>
              {t('clientDetails.noSessionsYet')}
            </Text>
          </View>
        ) : (
          groupedSessions.map((group) => (
            <View key={group.date}>
              <SessionGroupHeader
                date={group.date}
                totalDuration={group.totalDuration}
                totalBillable={group.totalBillable}
                currency={client.currency}
              />
              {group.sessions.map((session) => (
                <View key={session.id}>
                  <TimeSessionCard
                    session={session}
                    currency={client.currency}
                    onPress={
                      !session.is_active
                        ? () => setExpandedSessionId(
                            expandedSessionId === session.id ? null : session.id
                          )
                        : undefined
                    }
                    onEdit={
                      !session.is_active
                        ? () => handleEditSession(session.id)
                        : undefined
                    }
                    onDelete={
                      !session.is_active
                        ? () => handleDeleteSession(session.id)
                        : undefined
                    }
                  />
                  {expandedSessionId === session.id && !session.is_active && (
                    <View style={styles.photoSection}>
                      <PhotoGallery
                        photos={photos}
                        onAddFromCamera={async () => {
                          await addFromCamera(session.id);
                          refreshPhotos();
                        }}
                        onAddFromGallery={async () => {
                          await addFromGallery(session.id);
                          refreshPhotos();
                        }}
                        onDelete={async (photo) => {
                          await removePhoto(photo);
                          refreshPhotos();
                        }}
                        isLoading={isPhotoLoading}
                      />
                      <VoiceNotePlayer
                        voiceNotes={voiceNotes}
                        onRecord={startRecord}
                        onStopRecording={async () => {
                          await stopAndSave(session.id);
                          refreshVoiceNotes();
                        }}
                        onPlay={voicePlayer.play}
                        onPause={voicePlayer.pause}
                        onDelete={async (note) => {
                          await removeNote(note);
                          refreshVoiceNotes();
                        }}
                        isRecording={isRecording}
                        isPlaying={voicePlayer.isPlaying}
                        currentNoteId={voicePlayer.currentNoteId}
                        positionSeconds={voicePlayer.positionSeconds}
                        durationSeconds={voicePlayer.durationSeconds}
                        isLoading={isVoiceNoteLoading}
                        isPro={checkFeatureAccess('voice_notes')}
                        onUpgrade={() => navigation.navigate('Paywall', { feature: 'voice_notes' })}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </KeyboardAwareScrollView>
  );

  // Notes dialog for stopping timer
  const notesDialog = (
    <Modal
      visible={showNotesDialog}
      transparent
      animationType="fade"
      onRequestClose={() => setShowNotesDialog(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('clientDetails.addJobNotes')}</Text>
          <Text style={styles.modalSubtitle}>
            {t('clientDetails.describeWork')}
          </Text>
          <TextInput
            style={styles.modalNotesInput}
            placeholder={t('clientDetails.workExamplePlaceholder')}
            value={sessionNotes}
            onChangeText={setSessionNotes}
            placeholderTextColor={COLORS.gray400}
            multiline
            numberOfLines={4}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => handleConfirmStopTimer(false)}
            >
              <Text style={styles.modalButtonSecondaryText}>{t('clientDetails.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={() => handleConfirmStopTimer(true)}
            >
              <Text style={styles.modalButtonPrimaryText}>{t('clientDetails.saveAndStop')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ErrorBoundary>
      <View style={styles.flex}>{content}</View>
      {notesDialog}
    </ErrorBoundary>
  );
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
  markPaidButton: {
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
  photoSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  // Notes input for manual entry
  notesInput: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  useTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '10',
  },
  useTemplateButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.md,
  },
  modalNotesInput: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
