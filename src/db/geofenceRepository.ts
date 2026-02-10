import { getDatabase } from './database';
import { ClientGeofence, CreateGeofenceInput } from '../types';

/**
 * Get all active geofences
 */
export async function getActiveGeofences(): Promise<ClientGeofence[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM client_geofences WHERE is_active = 1'
  );
  return rows.map(castGeofence);
}

/**
 * Get all geofences
 */
export async function getAllGeofences(): Promise<ClientGeofence[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM client_geofences');
  return rows.map(castGeofence);
}

/**
 * Get geofence by client ID
 */
export async function getGeofenceByClientId(clientId: number): Promise<ClientGeofence | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM client_geofences WHERE client_id = ?',
    [clientId]
  );
  return row ? castGeofence(row) : null;
}

/**
 * Get geofence by ID
 */
export async function getGeofenceById(id: number): Promise<ClientGeofence | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM client_geofences WHERE id = ?',
    [id]
  );
  return row ? castGeofence(row) : null;
}

/**
 * Create or update a geofence for a client (one per client)
 */
export async function upsertGeofence(input: CreateGeofenceInput): Promise<ClientGeofence> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO client_geofences (client_id, latitude, longitude, radius, auto_start, auto_stop)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id) DO UPDATE SET
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       radius = excluded.radius,
       auto_start = excluded.auto_start,
       auto_stop = excluded.auto_stop,
       is_active = 1`,
    [
      input.client_id,
      input.latitude,
      input.longitude,
      input.radius,
      input.auto_start !== false ? 1 : 0,
      input.auto_stop !== false ? 1 : 0,
    ]
  );

  const geofence = await getGeofenceByClientId(input.client_id);
  if (!geofence) throw new Error('Failed to create geofence');
  return geofence;
}

/**
 * Toggle geofence active state
 */
export async function setGeofenceActive(id: number, isActive: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE client_geofences SET is_active = ? WHERE id = ?',
    [isActive ? 1 : 0, id]
  );
}

/**
 * Delete a geofence
 */
export async function deleteGeofence(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM client_geofences WHERE id = ?', [id]);
}

function castGeofence(row: any): ClientGeofence {
  return {
    ...row,
    is_active: Boolean(row.is_active),
    auto_start: Boolean(row.auto_start),
    auto_stop: Boolean(row.auto_stop),
  };
}
