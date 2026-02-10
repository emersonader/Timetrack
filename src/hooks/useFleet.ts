import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Vehicle,
  CreateVehicleInput,
  CreateMileageInput,
  CreateFuelInput,
  MileageEntry,
  FuelEntry,
} from '../types';
import {
  VehicleSummary,
  getVehicleSummaries,
  createVehicle,
  deleteVehicle,
  getMileageEntries,
  createMileageEntry,
  deleteMileageEntry,
  getFuelEntries,
  createFuelEntry,
  deleteFuelEntry,
} from '../db/fleetRepository';

export function useFleet() {
  const [summaries, setSummaries] = useState<VehicleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Per-vehicle detail
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [mileageEntries, setMileageEntries] = useState<MileageEntry[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);

  const navigation = useNavigation();

  const loadSummaries = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getVehicleSummaries();
      setSummaries(data);
    } catch (error) {
      console.error('Failed to load fleet:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadVehicleDetails = useCallback(async (vehicleId: number) => {
    const [mileage, fuel] = await Promise.all([
      getMileageEntries(vehicleId),
      getFuelEntries(vehicleId),
    ]);
    setMileageEntries(mileage);
    setFuelEntries(fuel);
  }, []);

  // Reload on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSummaries();
    });
    return unsubscribe;
  }, [navigation, loadSummaries]);

  useEffect(() => {
    if (selectedVehicleId) {
      loadVehicleDetails(selectedVehicleId);
    }
  }, [selectedVehicleId, loadVehicleDetails]);

  const addVehicle = useCallback(async (input: CreateVehicleInput) => {
    await createVehicle(input);
    await loadSummaries();
  }, [loadSummaries]);

  const removeVehicle = useCallback(async (id: number) => {
    await deleteVehicle(id);
    if (selectedVehicleId === id) {
      setSelectedVehicleId(null);
      setMileageEntries([]);
      setFuelEntries([]);
    }
    await loadSummaries();
  }, [loadSummaries, selectedVehicleId]);

  const addMileage = useCallback(async (input: CreateMileageInput) => {
    await createMileageEntry(input);
    await loadSummaries();
    if (selectedVehicleId === input.vehicle_id) {
      await loadVehicleDetails(input.vehicle_id);
    }
  }, [loadSummaries, loadVehicleDetails, selectedVehicleId]);

  const removeMileage = useCallback(async (id: number) => {
    await deleteMileageEntry(id);
    await loadSummaries();
    if (selectedVehicleId) {
      await loadVehicleDetails(selectedVehicleId);
    }
  }, [loadSummaries, loadVehicleDetails, selectedVehicleId]);

  const addFuel = useCallback(async (input: CreateFuelInput) => {
    await createFuelEntry(input);
    await loadSummaries();
    if (selectedVehicleId === input.vehicle_id) {
      await loadVehicleDetails(input.vehicle_id);
    }
  }, [loadSummaries, loadVehicleDetails, selectedVehicleId]);

  const removeFuel = useCallback(async (id: number) => {
    await deleteFuelEntry(id);
    await loadSummaries();
    if (selectedVehicleId) {
      await loadVehicleDetails(selectedVehicleId);
    }
  }, [loadSummaries, loadVehicleDetails, selectedVehicleId]);

  return {
    summaries,
    isLoading,
    selectedVehicleId,
    setSelectedVehicleId,
    mileageEntries,
    fuelEntries,
    addVehicle,
    removeVehicle,
    addMileage,
    removeMileage,
    addFuel,
    removeFuel,
    refresh: loadSummaries,
  };
}
