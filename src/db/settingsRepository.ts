import { getDatabase } from './database';
import { UserSettings, UpdateSettingsInput } from '../types';

const DEFAULT_PRIMARY_COLOR = '#2563EB';
const DEFAULT_ACCENT_COLOR = '#2563EB';

/**
 * Get user settings (singleton)
 */
export async function getSettings(): Promise<UserSettings> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<UserSettings>(
    'SELECT * FROM user_settings WHERE id = 1'
  );

  if (!result) {
    // Should never happen due to migration, but handle gracefully
    return {
      id: 1,
      business_name: null,
      business_phone: null,
      business_email: null,
      business_street: null,
      business_city: null,
      business_state: null,
      business_zip: null,
      logo_uri: null,
      primary_color: DEFAULT_PRIMARY_COLOR,
      accent_color: DEFAULT_ACCENT_COLOR,
      updated_at: null,
    };
  }

  return result;
}

/**
 * Update user settings
 */
export async function updateSettings(
  input: UpdateSettingsInput
): Promise<UserSettings> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Build dynamic update query
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.business_name !== undefined) {
    updates.push('business_name = ?');
    values.push(input.business_name);
  }
  if (input.business_phone !== undefined) {
    updates.push('business_phone = ?');
    values.push(input.business_phone);
  }
  if (input.business_email !== undefined) {
    updates.push('business_email = ?');
    values.push(input.business_email);
  }
  if (input.business_street !== undefined) {
    updates.push('business_street = ?');
    values.push(input.business_street);
  }
  if (input.business_city !== undefined) {
    updates.push('business_city = ?');
    values.push(input.business_city);
  }
  if (input.business_state !== undefined) {
    updates.push('business_state = ?');
    values.push(input.business_state);
  }
  if (input.business_zip !== undefined) {
    updates.push('business_zip = ?');
    values.push(input.business_zip);
  }
  if (input.logo_uri !== undefined) {
    updates.push('logo_uri = ?');
    values.push(input.logo_uri);
  }
  if (input.primary_color !== undefined) {
    updates.push('primary_color = ?');
    values.push(input.primary_color);
  }
  if (input.accent_color !== undefined) {
    updates.push('accent_color = ?');
    values.push(input.accent_color);
  }

  if (updates.length === 0) {
    return getSettings();
  }

  updates.push('updated_at = ?');
  values.push(now);

  await db.runAsync(
    `UPDATE user_settings SET ${updates.join(', ')} WHERE id = 1`,
    values
  );

  return getSettings();
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<UserSettings> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE user_settings SET
      business_name = NULL,
      business_phone = NULL,
      business_email = NULL,
      business_street = NULL,
      business_city = NULL,
      business_state = NULL,
      business_zip = NULL,
      logo_uri = NULL,
      primary_color = ?,
      accent_color = ?,
      updated_at = ?
    WHERE id = 1`,
    [DEFAULT_PRIMARY_COLOR, DEFAULT_ACCENT_COLOR, now]
  );

  return getSettings();
}
