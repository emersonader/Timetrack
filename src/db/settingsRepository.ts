import { getDatabase } from './database';
import { UserSettings, UpdateSettingsInput } from '../types';

const DEFAULT_PRIMARY_COLOR = '#2563EB';
const DEFAULT_ACCENT_COLOR = '#2563EB';

/**
 * Get user settings (singleton)
 */
export async function getSettings(): Promise<UserSettings> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<any>(
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
      first_launch_date: new Date().toISOString(),
      paypal_enabled: false,
      paypal_username: null,
      venmo_enabled: false,
      venmo_username: null,
      zelle_enabled: false,
      zelle_id: null,
      cashapp_enabled: false,
      cashapp_tag: null,
      stripe_enabled: false,
      stripe_payment_link: null,
    };
  }

  // Convert SQLite integers to booleans for enabled fields
  return {
    ...result,
    paypal_enabled: Boolean(result.paypal_enabled),
    venmo_enabled: Boolean(result.venmo_enabled),
    zelle_enabled: Boolean(result.zelle_enabled),
    cashapp_enabled: Boolean(result.cashapp_enabled),
    stripe_enabled: Boolean(result.stripe_enabled),
  };
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
  const values: (string | number | null)[] = [];

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
  // Payment methods
  if (input.paypal_enabled !== undefined) {
    updates.push('paypal_enabled = ?');
    values.push(input.paypal_enabled ? 1 : 0);
  }
  if (input.paypal_username !== undefined) {
    updates.push('paypal_username = ?');
    values.push(input.paypal_username);
  }
  if (input.venmo_enabled !== undefined) {
    updates.push('venmo_enabled = ?');
    values.push(input.venmo_enabled ? 1 : 0);
  }
  if (input.venmo_username !== undefined) {
    updates.push('venmo_username = ?');
    values.push(input.venmo_username);
  }
  if (input.zelle_enabled !== undefined) {
    updates.push('zelle_enabled = ?');
    values.push(input.zelle_enabled ? 1 : 0);
  }
  if (input.zelle_id !== undefined) {
    updates.push('zelle_id = ?');
    values.push(input.zelle_id);
  }
  if (input.cashapp_enabled !== undefined) {
    updates.push('cashapp_enabled = ?');
    values.push(input.cashapp_enabled ? 1 : 0);
  }
  if (input.cashapp_tag !== undefined) {
    updates.push('cashapp_tag = ?');
    values.push(input.cashapp_tag);
  }
  if (input.stripe_enabled !== undefined) {
    updates.push('stripe_enabled = ?');
    values.push(input.stripe_enabled ? 1 : 0);
  }
  if (input.stripe_payment_link !== undefined) {
    updates.push('stripe_payment_link = ?');
    values.push(input.stripe_payment_link);
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
 * Initialize first launch date if not set (for new users)
 */
export async function initializeFirstLaunchDate(): Promise<string> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Only set if not already set
  await db.runAsync(
    'UPDATE user_settings SET first_launch_date = ? WHERE id = 1 AND first_launch_date IS NULL',
    [now]
  );

  const settings = await getSettings();
  return settings.first_launch_date || now;
}

/**
 * Check if user is within trial period (15 days from first launch)
 */
export async function isWithinTrialPeriod(): Promise<boolean> {
  const settings = await getSettings();

  if (!settings.first_launch_date) {
    // First launch - initialize and return true
    await initializeFirstLaunchDate();
    return true;
  }

  const firstLaunch = new Date(settings.first_launch_date);
  const now = new Date();
  const daysSinceFirstLaunch = Math.floor(
    (now.getTime() - firstLaunch.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceFirstLaunch < 15;
}

/**
 * Get days remaining in trial
 */
export async function getTrialDaysRemaining(): Promise<number> {
  const settings = await getSettings();

  if (!settings.first_launch_date) {
    return 15;
  }

  const firstLaunch = new Date(settings.first_launch_date);
  const now = new Date();
  const daysSinceFirstLaunch = Math.floor(
    (now.getTime() - firstLaunch.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, 15 - daysSinceFirstLaunch);
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
      paypal_enabled = 0,
      paypal_username = NULL,
      venmo_enabled = 0,
      venmo_username = NULL,
      zelle_enabled = 0,
      zelle_id = NULL,
      cashapp_enabled = 0,
      cashapp_tag = NULL,
      stripe_enabled = 0,
      stripe_payment_link = NULL,
      updated_at = ?
    WHERE id = 1`,
    [DEFAULT_PRIMARY_COLOR, DEFAULT_ACCENT_COLOR, now]
  );

  return getSettings();
}
