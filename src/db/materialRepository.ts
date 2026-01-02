import { getDatabase } from './database';
import { Material, CreateMaterialInput, UpdateMaterialInput } from '../types';

/**
 * Get all materials for a client
 */
export async function getMaterialsByClientId(clientId: number): Promise<Material[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Material>(
    'SELECT * FROM materials WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
  return result;
}

/**
 * Get a single material by ID
 */
export async function getMaterialById(id: number): Promise<Material | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Material>(
    'SELECT * FROM materials WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Create a new material
 */
export async function createMaterial(input: CreateMaterialInput): Promise<Material> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO materials (client_id, name, cost) VALUES (?, ?, ?)',
    [input.client_id, input.name, input.cost]
  );

  const material = await getMaterialById(result.lastInsertRowId);
  if (!material) {
    throw new Error('Failed to create material');
  }
  return material;
}

/**
 * Update a material
 */
export async function updateMaterial(
  id: number,
  input: UpdateMaterialInput
): Promise<Material> {
  const db = await getDatabase();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.cost !== undefined) {
    updates.push('cost = ?');
    values.push(input.cost);
  }

  if (updates.length === 0) {
    const material = await getMaterialById(id);
    if (!material) throw new Error('Material not found');
    return material;
  }

  values.push(id);
  await db.runAsync(
    `UPDATE materials SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const material = await getMaterialById(id);
  if (!material) throw new Error('Material not found');
  return material;
}

/**
 * Delete a material
 */
export async function deleteMaterial(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM materials WHERE id = ?', [id]);
}

/**
 * Delete all materials for a client
 */
export async function deleteAllMaterialsByClientId(clientId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM materials WHERE client_id = ?', [clientId]);
}

/**
 * Get total material costs for a client
 */
export async function getTotalMaterialCost(clientId: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(cost), 0) as total FROM materials WHERE client_id = ?',
    [clientId]
  );
  return result?.total || 0;
}
