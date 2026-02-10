import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getActiveGeofences, getGeofenceByClientId } from '../db/geofenceRepository';
import { getActiveTimer } from '../db/sessionRepository';
import { ClientGeofence } from '../types';

const GEOFENCE_TASK_NAME = 'HOURFLOW_GEOFENCE_TASK';

// Distance threshold in meters — considered "inside" geofence
function isInsideGeofence(
  lat: number,
  lon: number,
  fence: ClientGeofence
): boolean {
  const distance = getDistanceMeters(lat, lon, fence.latitude, fence.longitude);
  return distance <= fence.radius;
}

/**
 * Haversine distance in meters between two coordinates
 */
function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Request location permissions (foreground + background)
 * Returns true if background access granted
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return false;
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return bgStatus === 'granted';
}

/**
 * Check if background location permission is granted
 */
export async function hasBackgroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Get current device location
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Start monitoring all active geofences via expo-location geofencing
 */
export async function startGeofenceMonitoring(): Promise<boolean> {
  try {
    const hasBgPermission = await hasBackgroundLocationPermission();
    if (!hasBgPermission) {
      console.log('No background location permission for geofencing');
      return false;
    }

    const geofences = await getActiveGeofences();
    if (geofences.length === 0) {
      // No active geofences — stop any existing monitoring
      await stopGeofenceMonitoring();
      return false;
    }

    // Build geofence regions
    const regions: Location.LocationRegion[] = geofences.map((gf) => ({
      identifier: `client_${gf.client_id}`,
      latitude: gf.latitude,
      longitude: gf.longitude,
      radius: gf.radius,
      notifyOnEnter: gf.auto_start,
      notifyOnExit: gf.auto_stop,
    }));

    // Start geofencing
    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
    console.log(`Geofence monitoring started for ${regions.length} regions`);
    return true;
  } catch (error) {
    console.error('Failed to start geofence monitoring:', error);
    return false;
  }
}

/**
 * Stop geofence monitoring
 */
export async function stopGeofenceMonitoring(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      console.log('Geofence monitoring stopped');
    }
  } catch (error) {
    console.error('Failed to stop geofence monitoring:', error);
  }
}

/**
 * Check if geofence monitoring is currently running
 */
export async function isGeofenceMonitoringActive(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
  } catch {
    return false;
  }
}

/**
 * Get the geofence task name (for registering the task handler externally)
 */
export function getGeofenceTaskName(): string {
  return GEOFENCE_TASK_NAME;
}

/**
 * Check which geofence the user is currently inside (if any)
 */
export async function checkCurrentGeofenceStatus(): Promise<{
  insideClientId: number | null;
  geofence: ClientGeofence | null;
}> {
  const location = await getCurrentLocation();
  if (!location) return { insideClientId: null, geofence: null };

  const geofences = await getActiveGeofences();
  for (const gf of geofences) {
    if (isInsideGeofence(location.latitude, location.longitude, gf)) {
      return { insideClientId: gf.client_id, geofence: gf };
    }
  }

  return { insideClientId: null, geofence: null };
}
