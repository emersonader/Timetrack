import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, ClientGeofence, Client } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  getAllGeofences,
  upsertGeofence,
  deleteGeofence,
  setGeofenceActive,
} from '../db/geofenceRepository';
import { getAllClients } from '../db/clientRepository';
import {
  requestLocationPermissions,
  getCurrentLocation,
  startGeofenceMonitoring,
  hasBackgroundLocationPermission,
} from '../services/geofenceService';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { formatFullName } from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'Geofences'>;

interface GeofenceWithClient extends ClientGeofence {
  clientName: string;
}

export function GeofencesScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const incomingClientId = route.params?.clientId ?? null;
  const [geofences, setGeofences] = useState<GeofenceWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBgPermission, setHasBgPermission] = useState(false);

  // Add geofence state — auto-open form if navigated from a client
  const [showAddForm, setShowAddForm] = useState(incomingClientId !== null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(incomingClientId);
  const [radius, setRadius] = useState('150');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Pro gate
  if (!isPremium) {
    navigation.replace('Paywall', { feature: 'geofencing' });
    return null;
  }

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [gfs, cls, bgPerm] = await Promise.all([
        getAllGeofences(),
        getAllClients(),
        hasBackgroundLocationPermission(),
      ]);
      setHasBgPermission(bgPerm);

      // Build client name map
      const clientMap = new Map(cls.map((c) => [c.id, c]));
      const withNames: GeofenceWithClient[] = gfs.map((gf) => {
        const client = clientMap.get(gf.client_id);
        return {
          ...gf,
          clientName: client
            ? formatFullName(client.first_name, client.last_name)
            : t('geofences.unknownClient'),
        };
      });

      setGeofences(withNames);

      // Filter out clients that already have geofences
      const geofenceClientIds = new Set(gfs.map((g) => g.client_id));
      setClients(cls.filter((c) => !geofenceClientIds.has(c.id)));
    } catch (error) {
      console.error('Failed to load geofences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRequestPermission = async () => {
    const granted = await requestLocationPermissions();
    setHasBgPermission(granted);
    if (!granted) {
      Alert.alert(
        t('geofences.permissionRequired'),
        t('geofences.backgroundLocationNeeded')
      );
    }
  };

  const handleAddGeofence = async () => {
    if (!selectedClientId) {
      Alert.alert(t('geofences.selectClient'), t('geofences.pleaseSelectClientFirst'));
      return;
    }

    const radiusNum = parseInt(radius, 10);
    if (isNaN(radiusNum) || radiusNum < 50 || radiusNum > 5000) {
      Alert.alert(t('geofences.invalidRadius'), t('geofences.radiusBetween50And5000'));
      return;
    }

    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert(
          t('geofences.locationUnavailable'),
          t('geofences.couldNotGetLocation')
        );
        return;
      }

      await upsertGeofence({
        client_id: selectedClientId,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: radiusNum,
      });

      // Restart monitoring with updated geofences
      await startGeofenceMonitoring();

      setShowAddForm(false);
      setSelectedClientId(null);
      setRadius('150');
      await loadData();

      Alert.alert(
        t('geofences.geofenceCreated'),
        t('geofences.locationSavedAutoTimer')
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('geofences.failedToCreateGeofence'));
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleToggleActive = async (gf: GeofenceWithClient) => {
    await setGeofenceActive(gf.id, !gf.is_active);
    await startGeofenceMonitoring();
    await loadData();
  };

  const handleDelete = (gf: GeofenceWithClient) => {
    Alert.alert(
      t('geofences.deleteGeofence'),
      t('geofences.removeGpsAutoClockIn', { clientName: gf.clientName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGeofence(gf.id);
            await startGeofenceMonitoring();
            await loadData();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Loading geofences..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Permission Banner */}
      {!hasBgPermission && (
        <TouchableOpacity style={styles.permissionBanner} onPress={handleRequestPermission}>
          <Ionicons name="location-outline" size={20} color={COLORS.warning} />
          <Text style={styles.permissionText}>
            Background location required for auto clock-in
          </Text>
          <Text style={styles.permissionAction}>Enable</Text>
        </TouchableOpacity>
      )}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="navigate-circle-outline" size={24} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Go to a client's job site and tap "Add Geofence" to save the location. The timer will auto-start when you arrive and auto-stop when you leave.
        </Text>
      </View>

      {/* Geofence List */}
      <FlatList
        data={geofences}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="location-outline" size={48} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>No Geofences</Text>
            <Text style={styles.emptyMessage}>
              Go to a client's job site and add a geofence to enable automatic time tracking.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.geofenceCard}>
            <View style={styles.geofenceHeader}>
              <View style={styles.geofenceInfo}>
                <Text style={styles.geofenceName}>{item.clientName}</Text>
                <Text style={styles.geofenceMeta}>
                  {item.radius}m radius
                  {item.auto_start ? ' \u00B7 Auto-start' : ''}
                  {item.auto_stop ? ' \u00B7 Auto-stop' : ''}
                </Text>
              </View>
              <Switch
                value={item.is_active}
                onValueChange={() => handleToggleActive(item)}
                trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
                thumbColor={item.is_active ? COLORS.primary : COLORS.gray100}
              />
            </View>
            <View style={styles.geofenceActions}>
              <Text style={styles.coordsText}>
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add Geofence Form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>Add Geofence</Text>
          <Text style={styles.addFormSubtitle}>
            Select a client, then your current GPS location will be saved.
          </Text>

          {/* Client Picker */}
          <View style={styles.clientPicker}>
            {clients.length === 0 ? (
              <Text style={styles.noClientsText}>All clients have geofences</Text>
            ) : (
              clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientChip,
                    selectedClientId === client.id && styles.clientChipSelected,
                  ]}
                  onPress={() => setSelectedClientId(client.id)}
                >
                  <Text
                    style={[
                      styles.clientChipText,
                      selectedClientId === client.id && styles.clientChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {formatFullName(client.first_name, client.last_name)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Radius */}
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Radius (meters):</Text>
            <TextInput
              style={styles.radiusInput}
              value={radius}
              onChangeText={setRadius}
              keyboardType="number-pad"
              placeholder="150"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.addFormButtons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowAddForm(false);
                setSelectedClientId(null);
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isGettingLocation && styles.saveBtnDisabled]}
              onPress={handleAddGeofence}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="location" size={18} color={COLORS.white} />
                  <Text style={styles.saveBtnText}>Save Current Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FAB */}
      {!showAddForm && clients.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}
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

  // Permission banner
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warning + '15',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    margin: SPACING.md,
    marginBottom: 0,
    borderRadius: BORDER_RADIUS.md,
  },
  permissionText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: '500',
  },
  permissionAction: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: '700',
  },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    margin: SPACING.md,
    marginBottom: 0,
    borderRadius: BORDER_RADIUS.md,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Geofence card
  geofenceCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  geofenceInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  geofenceName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  geofenceMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  geofenceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
  },
  coordsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },

  // Add form
  addForm: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  addFormTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  addFormSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.md,
  },
  clientPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  clientChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.gray50,
  },
  clientChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  clientChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  clientChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  noClientsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  radiusLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  radiusInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    width: 100,
  },
  addFormButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
});
