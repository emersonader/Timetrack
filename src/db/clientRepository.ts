import { getDatabase } from './database';
import { Client, CreateClientInput, UpdateClientInput } from '../types';

/**
 * Get all clients
 */
export async function getAllClients(): Promise<Client[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Client>('SELECT * FROM clients ORDER BY updated_at DESC');
  return result;
}

/**
 * Get a client by ID
 */
export async function getClientById(id: number): Promise<Client | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Client>(
    'SELECT * FROM clients WHERE id = ?',
    [id]
  );
  return result ?? null;
}

/**
 * Create a new client
 */
export async function createClient(input: CreateClientInput): Promise<Client> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO clients (first_name, last_name, phone, street, city, state, zip_code, email, hourly_rate, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.first_name.trim(),
      input.last_name.trim(),
      input.phone.trim(),
      input.street.trim(),
      input.city.trim(),
      input.state.trim(),
      input.zip_code.trim(),
      input.email.trim(),
      input.hourly_rate,
      now,
      now,
    ]
  );

  const newClient = await getClientById(result.lastInsertRowId);
  if (!newClient) {
    throw new Error('Failed to create client');
  }

  return newClient;
}

/**
 * Update an existing client
 */
export async function updateClient(
  id: number,
  input: UpdateClientInput
): Promise<Client> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Build dynamic update query
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [now];

  if (input.first_name !== undefined) {
    updates.push('first_name = ?');
    values.push(input.first_name.trim());
  }
  if (input.last_name !== undefined) {
    updates.push('last_name = ?');
    values.push(input.last_name.trim());
  }
  if (input.phone !== undefined) {
    updates.push('phone = ?');
    values.push(input.phone.trim());
  }
  if (input.street !== undefined) {
    updates.push('street = ?');
    values.push(input.street.trim());
  }
  if (input.city !== undefined) {
    updates.push('city = ?');
    values.push(input.city.trim());
  }
  if (input.state !== undefined) {
    updates.push('state = ?');
    values.push(input.state.trim());
  }
  if (input.zip_code !== undefined) {
    updates.push('zip_code = ?');
    values.push(input.zip_code.trim());
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email.trim());
  }
  if (input.hourly_rate !== undefined) {
    updates.push('hourly_rate = ?');
    values.push(input.hourly_rate);
  }

  values.push(id);

  await db.runAsync(
    `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const updatedClient = await getClientById(id);
  if (!updatedClient) {
    throw new Error('Client not found');
  }

  return updatedClient;
}

/**
 * Delete a client
 */
export async function deleteClient(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
}

/**
 * Search clients by name, phone, or address
 */
export async function searchClients(query: string): Promise<Client[]> {
  const db = await getDatabase();
  const searchQuery = `%${query.trim()}%`;

  const result = await db.getAllAsync<Client>(
    `SELECT * FROM clients
     WHERE first_name LIKE ?
        OR last_name LIKE ?
        OR phone LIKE ?
        OR street LIKE ?
        OR city LIKE ?
        OR state LIKE ?
        OR zip_code LIKE ?
        OR email LIKE ?
     ORDER BY updated_at DESC`,
    [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery]
  );

  return result;
}

/**
 * Get recent clients (most recently updated)
 */
export async function getRecentClients(limit: number = 5): Promise<Client[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Client>(
    'SELECT * FROM clients ORDER BY updated_at DESC LIMIT ?',
    [limit]
  );
  return result;
}

/**
 * Check if a client exists
 */
export async function clientExists(id: number): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM clients WHERE id = ?',
    [id]
  );
  return (result?.count ?? 0) > 0;
}

/**
 * Get total number of clients
 */
export async function getClientCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM clients'
  );
  return result?.count ?? 0;
}
