import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { VehicleSummary } from '../db/fleetRepository';
import { useFleet } from '../hooks/useFleet';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'Fleet'>;

type FormMode = 'none' | 'vehicle' | 'mileage' | 'fuel';

export function FleetScreen({ navigation }: Props) {
  const { isPremium } = useSubscription();
  const {
    summaries,
    isLoading,
    selectedVehicleId,
    setSelectedVehicleId,
    mileageEntries,
    fuelEntries,
    addVehicle,
    removeVehicle,
    addMileage,
    addFuel,
    removeMileage,
    removeFuel,
  } = useFleet();

  const [formMode, setFormMode] = useState<FormMode>('none');

  // Vehicle form
  const [vehicleName, setVehicleName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [odometer, setOdometer] = useState('');

  // Mileage form
  const [mileageStart, setMileageStart] = useState('');
  const [mileageEnd, setMileageEnd] = useState('');
  const [mileageNotes, setMileageNotes] = useState('');

  // Fuel form
  const [fuelGallons, setFuelGallons] = useState('');
  const [fuelCostPerGal, setFuelCostPerGal] = useState('');
  const [fuelOdometer, setFuelOdometer] = useState('');

  // Pro gate
  if (!isPremium) {
    navigation.replace('Paywall', { feature: 'fleet' });
    return null;
  }

  const selectedSummary = summaries.find((s) => s.vehicleId === selectedVehicleId);

  const resetForms = () => {
    setFormMode('none');
    setVehicleName('');
    setLicensePlate('');
    setOdometer('');
    setMileageStart('');
    setMileageEnd('');
    setMileageNotes('');
    setFuelGallons('');
    setFuelCostPerGal('');
    setFuelOdometer('');
  };

  const handleAddVehicle = async () => {
    const name = vehicleName.trim();
    if (!name) {
      Alert.alert('Required', 'Please enter a vehicle name.');
      return;
    }
    await addVehicle({
      name,
      license_plate: licensePlate.trim() || undefined,
      odometer: parseFloat(odometer) || 0,
    });
    resetForms();
  };

  const handleAddMileage = async () => {
    if (!selectedVehicleId) return;
    const start = parseFloat(mileageStart);
    const end = parseFloat(mileageEnd);
    if (isNaN(start) || isNaN(end) || end <= start) {
      Alert.alert('Invalid', 'End odometer must be greater than start.');
      return;
    }
    await addMileage({
      vehicle_id: selectedVehicleId,
      start_odometer: start,
      end_odometer: end,
      date: new Date().toISOString().split('T')[0],
      notes: mileageNotes.trim() || undefined,
    });
    resetForms();
  };

  const handleAddFuel = async () => {
    if (!selectedVehicleId) return;
    const gallons = parseFloat(fuelGallons);
    const costPerGal = parseFloat(fuelCostPerGal);
    const odo = parseFloat(fuelOdometer);
    if (isNaN(gallons) || gallons <= 0) {
      Alert.alert('Invalid', 'Please enter a valid gallon amount.');
      return;
    }
    if (isNaN(costPerGal) || costPerGal <= 0) {
      Alert.alert('Invalid', 'Please enter a valid cost per gallon.');
      return;
    }
    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Invalid', 'Please enter the current odometer reading.');
      return;
    }
    await addFuel({
      vehicle_id: selectedVehicleId,
      gallons,
      cost_per_gallon: costPerGal,
      odometer: odo,
      date: new Date().toISOString().split('T')[0],
    });
    resetForms();
  };

  const handleDeleteVehicle = (summary: VehicleSummary) => {
    Alert.alert(
      'Delete Vehicle',
      `Remove "${summary.vehicleName}" and all its mileage/fuel records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeVehicle(summary.vehicleId) },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Loading fleet..." />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
        {/* Vehicle List */}
        {summaries.length > 0 ? (
          summaries.map((s) => (
            <TouchableOpacity
              key={s.vehicleId}
              style={[
                styles.vehicleCard,
                selectedVehicleId === s.vehicleId && styles.vehicleCardSelected,
              ]}
              onPress={() => setSelectedVehicleId(
                selectedVehicleId === s.vehicleId ? null : s.vehicleId
              )}
              activeOpacity={0.7}
            >
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleIcon}>
                  <Ionicons name="car-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{s.vehicleName}</Text>
                  {s.licensePlate && (
                    <Text style={styles.vehiclePlate}>{s.licensePlate}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDeleteVehicle(s)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round(s.odometer).toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Odometer</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round(s.totalMileage).toLocaleString()}
                  </Text>
                  <Text style={styles.statLabel}>Miles Tracked</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatCurrency(s.totalFuelCost)}
                  </Text>
                  <Text style={styles.statLabel}>Fuel Cost</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {s.avgMpg > 0 ? `${Math.round(s.avgMpg * 10) / 10}` : '--'}
                  </Text>
                  <Text style={styles.statLabel}>Avg MPG</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : formMode !== 'vehicle' ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>No vehicles</Text>
            <Text style={styles.emptyText}>Add a vehicle to start tracking mileage and fuel</Text>
          </View>
        ) : null}

        {/* Vehicle details: mileage + fuel entries */}
        {selectedSummary && (
          <View style={styles.detailSection}>
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => setFormMode(formMode === 'mileage' ? 'none' : 'mileage')}
              >
                <Ionicons name="speedometer-outline" size={16} color={COLORS.white} />
                <Text style={styles.detailBtnText}>+ Mileage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailBtn, { backgroundColor: COLORS.warning }]}
                onPress={() => setFormMode(formMode === 'fuel' ? 'none' : 'fuel')}
              >
                <Ionicons name="flame-outline" size={16} color={COLORS.white} />
                <Text style={styles.detailBtnText}>+ Fuel</Text>
              </TouchableOpacity>
            </View>

            {/* Mileage form */}
            {formMode === 'mileage' && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Log Mileage</Text>
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={mileageStart}
                    onChangeText={setMileageStart}
                    placeholder="Start odometer"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={mileageEnd}
                    onChangeText={setMileageEnd}
                    placeholder="End odometer"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={mileageNotes}
                  onChangeText={setMileageNotes}
                  placeholder="Notes (optional)"
                  placeholderTextColor={COLORS.textMuted}
                />
                <View style={styles.formBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddMileage}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Fuel form */}
            {formMode === 'fuel' && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Log Fuel</Text>
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={fuelGallons}
                    onChangeText={setFuelGallons}
                    placeholder="Gallons"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={fuelCostPerGal}
                    onChangeText={setFuelCostPerGal}
                    placeholder="$/gallon"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={fuelOdometer}
                  onChangeText={setFuelOdometer}
                  placeholder="Current odometer"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
                <View style={styles.formBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddFuel}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Recent mileage entries */}
            {mileageEntries.length > 0 && (
              <View style={styles.entrySection}>
                <Text style={styles.entrySectionTitle}>Recent Mileage</Text>
                {mileageEntries.slice(0, 5).map((entry) => (
                  <View key={entry.id} style={styles.entryRow}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryPrimary}>
                        {Math.round(entry.distance)} mi
                      </Text>
                      <Text style={styles.entrySecondary}>
                        {formatDate(entry.date)}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Delete', 'Remove this mileage entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => removeMileage(entry.id) },
                      ]);
                    }}>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.gray400} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Recent fuel entries */}
            {fuelEntries.length > 0 && (
              <View style={styles.entrySection}>
                <Text style={styles.entrySectionTitle}>Recent Fuel</Text>
                {fuelEntries.slice(0, 5).map((entry) => (
                  <View key={entry.id} style={styles.entryRow}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryPrimary}>
                        {entry.gallons} gal · {formatCurrency(entry.total_cost)}
                      </Text>
                      <Text style={styles.entrySecondary}>
                        {formatDate(entry.date)} · {formatCurrency(entry.cost_per_gallon)}/gal
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Delete', 'Remove this fuel entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => removeFuel(entry.id) },
                      ]);
                    }}>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.gray400} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Add vehicle form */}
        {formMode === 'vehicle' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add Vehicle</Text>
            <TextInput
              style={styles.input}
              value={vehicleName}
              onChangeText={setVehicleName}
              placeholder="Vehicle name (e.g. 2020 Ford F-150) *"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={licensePlate}
                onChangeText={setLicensePlate}
                placeholder="License plate"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={odometer}
                onChangeText={setOdometer}
                placeholder="Current miles"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForms}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddVehicle}>
                <Text style={styles.saveBtnText}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add vehicle button */}
        {formMode !== 'vehicle' && (
          <TouchableOpacity
            style={styles.addVehicleBtn}
            onPress={() => setFormMode('vehicle')}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addVehicleBtnText}>Add Vehicle</Text>
          </TouchableOpacity>
        )}
    </KeyboardAwareScrollView>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  // Vehicle card
  vehicleCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  vehicleCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  vehiclePlate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingTop: SPACING.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 1,
  },

  // Detail section
  detailSection: {
    marginTop: SPACING.sm,
  },
  detailActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  detailBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Entry section
  entrySection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  entrySectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  entryInfo: {
    flex: 1,
  },
  entryPrimary: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  entrySecondary: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 1,
  },

  // Forms
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  formTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
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
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
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
  },

  // Add vehicle button
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  addVehicleBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
