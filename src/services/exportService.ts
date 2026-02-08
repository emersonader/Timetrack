import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { getDatabase } from '../db/database';
import { getAllClients } from '../db/clientRepository';
import { getSessionsByClientId } from '../db/sessionRepository';
import { getAllInvoices } from '../db/invoiceRepository';
import { secondsToHours } from '../utils/formatters';

// ---- CSV Export ----

export async function exportSessionsCSV(limitDays?: number): Promise<string> {
  const clients = await getAllClients();
  const rows: string[][] = [
    ['Client', 'Date', 'Start Time', 'End Time', 'Duration (hours)', 'Hourly Rate', 'Amount', 'Notes'],
  ];

  for (const client of clients) {
    const sessions = await getSessionsByClientId(client.id);
    const cutoff = limitDays ? new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000) : null;

    for (const session of sessions) {
      if (session.is_active) continue;
      if (cutoff && new Date(session.date) < cutoff) continue;

      const hours = secondsToHours(session.duration);
      const amount = hours * client.hourly_rate;
      rows.push([
        `${client.first_name} ${client.last_name}`,
        session.date,
        session.start_time,
        session.end_time || '',
        hours.toFixed(2),
        client.hourly_rate.toFixed(2),
        amount.toFixed(2),
        session.notes || '',
      ]);
    }
  }

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const file = new File(Paths.cache, 'hourflow-sessions.csv');
  file.write(csv);
  return file.uri;
}

export async function exportInvoicesCSV(limitDays?: number): Promise<string> {
  const invoices = await getAllInvoices();
  const clients = await getAllClients();
  const clientMap: Record<number, string> = {};
  for (const c of clients) {
    clientMap[c.id] = `${c.first_name} ${c.last_name}`;
  }

  const cutoff = limitDays ? new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000) : null;

  const rows: string[][] = [
    ['Invoice ID', 'Client', 'Total Hours', 'Total Amount', 'Sent Date', 'Send Method', 'Created'],
  ];

  for (const inv of invoices) {
    if (cutoff && new Date(inv.created_at) < cutoff) continue;
    rows.push([
      String(inv.id),
      clientMap[inv.client_id] || 'Unknown',
      inv.total_hours.toFixed(2),
      inv.total_amount.toFixed(2),
      inv.sent_date || 'Not sent',
      inv.send_method || '-',
      inv.created_at,
    ]);
  }

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const file = new File(Paths.cache, 'hourflow-invoices.csv');
  file.write(csv);
  return file.uri;
}

// ---- Excel Export ----

export async function exportExcel(): Promise<string> {
  const clients = await getAllClients();

  // Sessions sheet
  const sessionRows: any[] = [];
  for (const client of clients) {
    const sessions = await getSessionsByClientId(client.id);
    for (const session of sessions) {
      if (session.is_active) continue;
      const hours = secondsToHours(session.duration);
      sessionRows.push({
        Client: `${client.first_name} ${client.last_name}`,
        Date: session.date,
        'Start Time': session.start_time,
        'End Time': session.end_time || '',
        'Duration (hours)': Number(hours.toFixed(2)),
        'Hourly Rate': client.hourly_rate,
        Amount: Number((hours * client.hourly_rate).toFixed(2)),
        Notes: session.notes || '',
      });
    }
  }

  // Clients sheet
  const clientRows = clients.map(c => ({
    Name: `${c.first_name} ${c.last_name}`,
    Phone: c.phone,
    Email: c.email,
    'Hourly Rate': c.hourly_rate,
    Street: c.street,
    City: c.city,
    State: c.state,
    'Zip Code': c.zip_code,
  }));

  // Invoices sheet
  const invoices = await getAllInvoices();
  const clientNameMap: Record<number, string> = {};
  for (const c of clients) clientNameMap[c.id] = `${c.first_name} ${c.last_name}`;

  const invoiceRows = invoices.map(inv => ({
    'Invoice ID': inv.id,
    Client: clientNameMap[inv.client_id] || 'Unknown',
    'Total Hours': inv.total_hours,
    'Total Amount': inv.total_amount,
    'Sent Date': inv.sent_date || 'Not sent',
    'Send Method': inv.send_method || '-',
    Created: inv.created_at,
  }));

  const wb = XLSX.utils.book_new();
  const sessionsWs = XLSX.utils.json_to_sheet(sessionRows);
  XLSX.utils.book_append_sheet(wb, sessionsWs, 'Sessions');
  const clientsWs = XLSX.utils.json_to_sheet(clientRows);
  XLSX.utils.book_append_sheet(wb, clientsWs, 'Clients');
  const invoicesWs = XLSX.utils.json_to_sheet(invoiceRows);
  XLSX.utils.book_append_sheet(wb, invoicesWs, 'Invoices');

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const file = new File(Paths.cache, 'hourflow-data.xlsx');
  file.write(wbout, { encoding: 'base64' });
  return file.uri;
}

// ---- Database Backup ----

export async function createDatabaseBackup(): Promise<string> {
  const db = await getDatabase();
  const backupData: Record<string, any[]> = {};

  const tables = ['clients', 'time_sessions', 'invoices', 'materials', 'user_settings', 'tags', 'session_tags'];
  for (const table of tables) {
    try {
      const rows = await db.getAllAsync(`SELECT * FROM ${table}`);
      backupData[table] = rows;
    } catch {
      backupData[table] = [];
    }
  }

  const backup = {
    version: 1,
    created_at: new Date().toISOString(),
    app: 'HourFlow',
    data: backupData,
  };

  const json = JSON.stringify(backup, null, 2);
  const file = new File(Paths.cache, 'hourflow-backup.json');
  file.write(json);
  return file.uri;
}

// ---- Share helper ----

export async function shareFile(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(filePath);
}
