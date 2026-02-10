import { getDatabase } from './database';
import { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput } from '../types';

/**
 * Get all catalog items, ordered by name
 */
export async function getAllCatalogItems(): Promise<CatalogItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<CatalogItem>(
    'SELECT * FROM material_catalog ORDER BY name ASC'
  );
}

/**
 * Get low-stock items (current_quantity <= reorder_level AND reorder_level > 0)
 */
export async function getLowStockItems(): Promise<CatalogItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<CatalogItem>(
    'SELECT * FROM material_catalog WHERE reorder_level > 0 AND current_quantity <= reorder_level ORDER BY current_quantity ASC'
  );
}

/**
 * Search catalog items by name or barcode
 */
export async function searchCatalogItems(query: string): Promise<CatalogItem[]> {
  const db = await getDatabase();
  const like = `%${query}%`;
  return db.getAllAsync<CatalogItem>(
    'SELECT * FROM material_catalog WHERE name LIKE ? OR barcode LIKE ? ORDER BY name ASC',
    [like, like]
  );
}

/**
 * Get a catalog item by ID
 */
export async function getCatalogItemById(id: number): Promise<CatalogItem | null> {
  const db = await getDatabase();
  return db.getFirstAsync<CatalogItem>(
    'SELECT * FROM material_catalog WHERE id = ?',
    [id]
  );
}

/**
 * Get a catalog item by barcode
 */
export async function getCatalogItemByBarcode(barcode: string): Promise<CatalogItem | null> {
  const db = await getDatabase();
  return db.getFirstAsync<CatalogItem>(
    'SELECT * FROM material_catalog WHERE barcode = ?',
    [barcode]
  );
}

/**
 * Create a new catalog item
 */
export async function createCatalogItem(input: CreateCatalogItemInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO material_catalog (name, default_cost, barcode, supplier_name, supplier_contact, unit, reorder_level, current_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.default_cost,
      input.barcode ?? null,
      input.supplier_name ?? null,
      input.supplier_contact ?? null,
      input.unit ?? 'each',
      input.reorder_level ?? 0,
      input.current_quantity ?? 0,
    ]
  );
  return result.lastInsertRowId;
}

/**
 * Update a catalog item
 */
export async function updateCatalogItem(id: number, input: UpdateCatalogItemInput): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.default_cost !== undefined) { fields.push('default_cost = ?'); values.push(input.default_cost); }
  if (input.barcode !== undefined) { fields.push('barcode = ?'); values.push(input.barcode); }
  if (input.supplier_name !== undefined) { fields.push('supplier_name = ?'); values.push(input.supplier_name); }
  if (input.supplier_contact !== undefined) { fields.push('supplier_contact = ?'); values.push(input.supplier_contact); }
  if (input.unit !== undefined) { fields.push('unit = ?'); values.push(input.unit); }
  if (input.reorder_level !== undefined) { fields.push('reorder_level = ?'); values.push(input.reorder_level); }
  if (input.current_quantity !== undefined) { fields.push('current_quantity = ?'); values.push(input.current_quantity); }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await db.runAsync(
    `UPDATE material_catalog SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a catalog item
 */
export async function deleteCatalogItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM material_catalog WHERE id = ?', [id]);
}

/**
 * Adjust quantity (positive = add stock, negative = use stock)
 */
export async function adjustQuantity(id: number, delta: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE material_catalog SET current_quantity = MAX(0, current_quantity + ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [delta, id]
  );
}

/**
 * Get catalog item count
 */
export async function getCatalogItemCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM material_catalog'
  );
  return row?.count ?? 0;
}
