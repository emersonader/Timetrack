import * as Calendar from 'expo-calendar';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CalendarSyncConfig } from '../types';
import { getDatabase } from '../db/database';

// ---- Calendar Integration ----

/**
 * Request calendar read/write permissions
 */
export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Get all available calendars on the device
 */
export async function getAvailableCalendars(): Promise<Calendar.Calendar[]> {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) {
    return [];
  }
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

/**
 * Sync completed time sessions to a device calendar as events.
 * Creates one calendar event per session for the last N days.
 * Returns the count of events created.
 */
export async function syncSessionsToCalendar(
  calendarId: string,
  daysBack: number = 30
): Promise<number> {
  const db = await getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffStr = cutoffDate.toISOString();

  const sessions = await db.getAllAsync<{
    id: number;
    client_name: string;
    start_time: string;
    end_time: string;
    notes: string | null;
  }>(
    `SELECT ts.id, (c.first_name || ' ' || c.last_name) AS client_name,
            ts.start_time, ts.end_time, ts.notes
     FROM time_sessions ts
     JOIN clients c ON c.id = ts.client_id
     WHERE ts.is_active = 0
       AND ts.end_time IS NOT NULL
       AND ts.start_time >= ?
     ORDER BY ts.start_time ASC`,
    [cutoffStr]
  );

  let created = 0;
  for (const session of sessions) {
    try {
      await Calendar.createEventAsync(calendarId, {
        title: `Job: ${session.client_name}`,
        startDate: new Date(session.start_time),
        endDate: new Date(session.end_time),
        notes: session.notes || undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      created++;
    } catch (error) {
      console.error(`Failed to create calendar event for session ${session.id}:`, error);
    }
  }

  // Update the last_synced timestamp
  await updateLastSynced(calendarId);

  return created;
}

/**
 * Get all synced calendar configurations from the DB
 */
export async function getSyncedCalendars(): Promise<CalendarSyncConfig[]> {
  const db = await getDatabase();
  return db.getAllAsync<CalendarSyncConfig>(
    'SELECT * FROM calendar_sync WHERE sync_enabled = 1 ORDER BY calendar_name ASC'
  );
}

/**
 * Enable sync for a specific calendar
 */
export async function enableCalendarSync(
  calendarId: string,
  calendarName: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO calendar_sync (calendar_id, calendar_name, sync_enabled)
     VALUES (?, ?, 1)`,
    [calendarId, calendarName]
  );
}

/**
 * Disable sync for a specific calendar
 */
export async function disableCalendarSync(calendarId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM calendar_sync WHERE calendar_id = ?',
    [calendarId]
  );
}

/**
 * Update the last_synced timestamp for a calendar
 */
export async function updateLastSynced(calendarId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE calendar_sync SET last_synced = ? WHERE calendar_id = ?',
    [new Date().toISOString(), calendarId]
  );
}

// ---- Accounting Export: QuickBooks (IIF) ----

/**
 * Export time entries in QuickBooks IIF (Intuit Interchange Format).
 * Writes to a .iif file, shares via the native share sheet, and returns the file URI.
 */
export async function exportToQuickBooks(
  startDate: string,
  endDate: string
): Promise<string> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    client_name: string;
    date: string;
    duration: number;
    notes: string | null;
  }>(
    `SELECT (c.first_name || ' ' || c.last_name) AS client_name,
            ts.date, ts.duration, ts.notes
     FROM time_sessions ts
     JOIN clients c ON c.id = ts.client_id
     WHERE ts.is_active = 0
       AND ts.end_time IS NOT NULL
       AND ts.date >= ?
       AND ts.date <= ?
     ORDER BY ts.date ASC`,
    [startDate, endDate]
  );

  // Build IIF content
  const lines: string[] = [];
  // IIF header for time tracking
  lines.push('!TIMEACT\tDATE\tJOB\tDURATION\tNOTE');

  for (const row of rows) {
    const hours = (row.duration / 3600).toFixed(2);
    const memo = (row.notes || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    lines.push(`TIMEACT\t${row.date}\t${row.client_name}\t${hours}\t${memo}`);
  }

  const content = lines.join('\n');
  const file = new File(Paths.cache, 'hourflow-quickbooks.iif');
  file.write(content);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle: 'Export QuickBooks IIF',
    });
  }

  return file.uri;
}

// ---- Accounting Export: Xero (CSV) ----

/**
 * Export time entries in Xero timesheet CSV import format.
 * Columns: Date, Project, Task, Hours, Notes
 * Writes to a .csv file, shares via the native share sheet, and returns the file URI.
 */
export async function exportToXero(
  startDate: string,
  endDate: string
): Promise<string> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    client_name: string;
    date: string;
    duration: number;
    notes: string | null;
  }>(
    `SELECT (c.first_name || ' ' || c.last_name) AS client_name,
            ts.date, ts.duration, ts.notes
     FROM time_sessions ts
     JOIN clients c ON c.id = ts.client_id
     WHERE ts.is_active = 0
       AND ts.end_time IS NOT NULL
       AND ts.date >= ?
       AND ts.date <= ?
     ORDER BY ts.date ASC`,
    [startDate, endDate]
  );

  const csvRows: string[][] = [
    ['Date', 'Project', 'Task', 'Hours', 'Notes'],
  ];

  for (const row of rows) {
    const hours = (row.duration / 3600).toFixed(2);
    csvRows.push([
      row.date,
      row.client_name,
      'Time Entry',
      hours,
      row.notes || '',
    ]);
  }

  const csv = csvRows
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const file = new File(Paths.cache, 'hourflow-xero-timesheet.csv');
  file.write(csv);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Xero Timesheet CSV',
    });
  }

  return file.uri;
}
