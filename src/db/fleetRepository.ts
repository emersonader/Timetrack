import { getDatabase } from './database';
import {
  Vehicle,
  CreateVehicleInput,
  MileageEntry,
  CreateMileageInput,
  FuelEntry,
  CreateFuelInput,
} from '../types';

// --- Vehicles ---

export async function getAllVehicles(): Promise<Vehicle[]> {
  const db = await getDatabase();
  return db.getAllAsync<Vehicle>('SELECT * FROM vehicles ORDER BY name ASC');
}

export async function getVehicleById(id: number): Promise<Vehicle | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Vehicle>('SELECT * FROM vehicles WHERE id = ?', [id]);
}

export async function createVehicle(input: CreateVehicleInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO vehicles (name, license_plate, odometer) VALUES (?, ?, ?)',
    [input.name, input.license_plate ?? null, input.odometer ?? 0]
  );
  return result.lastInsertRowId;
}

export async function updateVehicleOdometer(id: number, odometer: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE vehicles SET odometer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [odometer, id]
  );
}

export async function deleteVehicle(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', [id]);
}

// --- Mileage ---

export async function getMileageEntries(vehicleId: number, limit: number = 50): Promise<MileageEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<MileageEntry>(
    'SELECT * FROM mileage_entries WHERE vehicle_id = ? ORDER BY date DESC LIMIT ?',
    [vehicleId, limit]
  );
}

export async function createMileageEntry(input: CreateMileageInput): Promise<number> {
  const db = await getDatabase();
  const distance = input.end_odometer - input.start_odometer;
  const result = await db.runAsync(
    'INSERT INTO mileage_entries (vehicle_id, client_id, start_odometer, end_odometer, distance, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [input.vehicle_id, input.client_id ?? null, input.start_odometer, input.end_odometer, distance, input.date, input.notes ?? null]
  );
  // Update vehicle odometer
  await updateVehicleOdometer(input.vehicle_id, input.end_odometer);
  return result.lastInsertRowId;
}

export async function deleteMileageEntry(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM mileage_entries WHERE id = ?', [id]);
}

export async function getTotalMileage(vehicleId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT COALESCE(SUM(distance), 0) as total FROM mileage_entries WHERE vehicle_id = ?',
    [vehicleId]
  );
  return row?.total ?? 0;
}

// --- Fuel ---

export async function getFuelEntries(vehicleId: number, limit: number = 50): Promise<FuelEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<FuelEntry>(
    'SELECT * FROM fuel_entries WHERE vehicle_id = ? ORDER BY date DESC LIMIT ?',
    [vehicleId, limit]
  );
}

export async function createFuelEntry(input: CreateFuelInput): Promise<number> {
  const db = await getDatabase();
  const totalCost = input.gallons * input.cost_per_gallon;
  const result = await db.runAsync(
    'INSERT INTO fuel_entries (vehicle_id, gallons, cost_per_gallon, total_cost, odometer, date) VALUES (?, ?, ?, ?, ?, ?)',
    [input.vehicle_id, input.gallons, input.cost_per_gallon, totalCost, input.odometer, input.date]
  );
  // Update vehicle odometer if fuel odometer is higher
  await db.runAsync(
    'UPDATE vehicles SET odometer = MAX(odometer, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [input.odometer, input.vehicle_id]
  );
  return result.lastInsertRowId;
}

export async function deleteFuelEntry(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM fuel_entries WHERE id = ?', [id]);
}

export async function getTotalFuelCost(vehicleId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT COALESCE(SUM(total_cost), 0) as total FROM fuel_entries WHERE vehicle_id = ?',
    [vehicleId]
  );
  return row?.total ?? 0;
}

// --- Summaries ---

export interface VehicleSummary {
  vehicleId: number;
  vehicleName: string;
  licensePlate: string | null;
  odometer: number;
  totalMileage: number;
  totalFuelCost: number;
  totalFuelGallons: number;
  avgMpg: number;
}

export async function getVehicleSummaries(): Promise<VehicleSummary[]> {
  const db = await getDatabase();
  const vehicles = await getAllVehicles();
  const summaries: VehicleSummary[] = [];

  for (const v of vehicles) {
    const mileage = await getTotalMileage(v.id);
    const fuelCost = await getTotalFuelCost(v.id);

    const fuelRow = await db.getFirstAsync<{ totalGallons: number | null }>(
      'SELECT COALESCE(SUM(gallons), 0) as totalGallons FROM fuel_entries WHERE vehicle_id = ?',
      [v.id]
    );
    const totalGallons = fuelRow?.totalGallons ?? 0;

    summaries.push({
      vehicleId: v.id,
      vehicleName: v.name,
      licensePlate: v.license_plate,
      odometer: v.odometer,
      totalMileage: mileage,
      totalFuelCost: fuelCost,
      totalFuelGallons: totalGallons,
      avgMpg: totalGallons > 0 ? mileage / totalGallons : 0,
    });
  }

  return summaries;
}
