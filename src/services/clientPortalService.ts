import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../db/database';
import { Client, TimeSession, Invoice, Material, Photo, UserSettings } from '../types';
import { formatCurrencyAmount } from '../utils/currency';

interface ReportData {
  client: Client;
  settings: UserSettings;
  sessions: TimeSession[];
  invoices: Invoice[];
  materials: Material[];
  photos: Photo[];
  totalDuration: number;
  totalBilled: number;
  sessionCount: number;
}

/**
 * Gather all data needed for a client progress report
 */
async function getReportData(clientId: number): Promise<ReportData> {
  const db = await getDatabase();

  // Fetch client
  const client = await db.getFirstAsync<Client>(
    'SELECT * FROM clients WHERE id = ?',
    [clientId]
  );
  if (!client) {
    throw new Error('Client not found');
  }

  // Fetch business settings
  const settings = await db.getFirstAsync<UserSettings>(
    'SELECT * FROM user_settings WHERE id = 1'
  );
  if (!settings) {
    throw new Error('Settings not found');
  }

  // Completed sessions from the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const sessions = await db.getAllAsync<TimeSession>(
    `SELECT * FROM time_sessions
     WHERE client_id = ? AND is_active = 0 AND date >= ?
     ORDER BY date DESC, start_time DESC`,
    [clientId, ninetyDaysAgo]
  );

  // Invoices for this client
  const invoices = await db.getAllAsync<Invoice>(
    'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );

  // Materials for this client
  const materials = await db.getAllAsync<Material>(
    'SELECT * FROM materials WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );

  // Session photos (for all fetched sessions)
  let photos: Photo[] = [];
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id).join(',');
    photos = await db.getAllAsync<Photo>(
      `SELECT * FROM photos WHERE session_id IN (${sessionIds}) ORDER BY captured_at DESC`
    );
  }

  // Compute totals
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalBilled = sessions.reduce((sum, s) => {
    const hours = s.duration / 3600;
    return sum + hours * client.hourly_rate;
  }, 0);

  return {
    client,
    settings,
    sessions,
    invoices,
    materials,
    photos,
    totalDuration,
    totalBilled,
    sessionCount: sessions.length,
  };
}

/**
 * Format seconds into "Xh Ym" for the HTML report
 */
function fmtDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return 'Less than 1 min';
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/**
 * Format a date string for display in the report
 */
function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Build the self-contained HTML string for the client progress report
 */
function buildHtml(
  data: ReportData,
  options: {
    includeSessions: boolean;
    includeInvoices: boolean;
    includeMaterials: boolean;
    includePhotos: boolean;
  }
): string {
  const {
    client,
    settings,
    sessions,
    invoices,
    materials,
    photos,
    totalDuration,
    totalBilled,
    sessionCount,
  } = data;

  const businessName = settings.business_name || 'HourFlow';
  const currency = client.currency || 'USD';
  const clientName = `${client.first_name} ${client.last_name}`;
  const generatedDate = fmtDate(new Date().toISOString());
  const totalMaterialsCost = materials.reduce((sum, m) => sum + m.cost, 0);

  // Build the sessions table rows
  let sessionsHtml = '';
  if (options.includeSessions && sessions.length > 0) {
    const rows = sessions
      .map(
        (s) => `
        <tr>
          <td>${fmtDate(s.date)}</td>
          <td>${fmtDuration(s.duration)}</td>
          <td>${s.notes || '-'}</td>
        </tr>`
      )
      .join('');

    sessionsHtml = `
      <div class="section">
        <h2>Recent Sessions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Duration</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;
  }

  // Build the invoices table
  let invoicesHtml = '';
  if (options.includeInvoices && invoices.length > 0) {
    const rows = invoices
      .map(
        (inv) => `
        <tr>
          <td>${fmtDate(inv.created_at)}</td>
          <td>${formatCurrencyAmount(inv.total_amount, inv.currency || currency)}</td>
          <td><span class="badge ${inv.sent_date ? 'badge-sent' : 'badge-pending'}">${inv.sent_date ? 'Sent' : 'Pending'}</span></td>
        </tr>`
      )
      .join('');

    invoicesHtml = `
      <div class="section">
        <h2>Invoices</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;
  }

  // Build the materials list
  let materialsHtml = '';
  if (options.includeMaterials && materials.length > 0) {
    const rows = materials
      .map(
        (m) => `
        <tr>
          <td>${m.name}</td>
          <td>${formatCurrencyAmount(m.cost, currency)}</td>
        </tr>`
      )
      .join('');

    materialsHtml = `
      <div class="section">
        <h2>Materials</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="total-row">
          <span>Materials Total</span>
          <span class="total-amount">${formatCurrencyAmount(totalMaterialsCost, currency)}</span>
        </div>
      </div>`;
  }

  // Build the photos section
  let photosHtml = '';
  if (options.includePhotos && photos.length > 0) {
    const photoItems = photos
      .map(
        (p) => `
        <div class="photo-item">
          <img src="${p.file_path}" alt="Job photo" onerror="this.parentElement.style.display='none'" />
          <span class="photo-date">${fmtDate(p.captured_at)}</span>
        </div>`
      )
      .join('');

    photosHtml = `
      <div class="section">
        <h2>Job Photos</h2>
        <div class="photo-grid">
          ${photoItems}
        </div>
      </div>`;
  }

  // Contact details
  const contactParts: string[] = [];
  if (client.phone) contactParts.push(`<p><strong>Phone:</strong> ${client.phone}</p>`);
  if (client.email) contactParts.push(`<p><strong>Email:</strong> ${client.email}</p>`);
  if (client.street) {
    const address = `${client.street}, ${client.city}, ${client.state} ${client.zip_code}`;
    contactParts.push(`<p><strong>Address:</strong> ${address}</p>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Job Progress Report - ${clientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #F9FAFB;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    .header {
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
      padding: 32px 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    .client-info {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .client-info h2 {
      font-size: 20px;
      color: #111827;
      margin-bottom: 8px;
    }
    .client-info p {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 4px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #059669;
    }
    .summary-card .label {
      font-size: 12px;
      color: #6B7280;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .section h2 {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      border-bottom: 1px solid #E5E7EB;
    }
    td {
      padding: 10px 12px;
      font-size: 14px;
      border-bottom: 1px solid #F3F4F6;
      color: #374151;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-sent {
      background: #D1FAE5;
      color: #065F46;
    }
    .badge-pending {
      background: #FEF3C7;
      color: #92400E;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin-top: 8px;
      border-top: 2px solid #E5E7EB;
      font-weight: 600;
    }
    .total-amount {
      color: #059669;
      font-size: 16px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    .photo-item {
      text-align: center;
    }
    .photo-item img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 8px;
      background: #F3F4F6;
    }
    .photo-date {
      display: block;
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      padding: 24px;
      font-size: 12px;
      color: #9CA3AF;
    }
    .footer .app-name {
      font-weight: 600;
      color: #059669;
    }
    @media (max-width: 600px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
      .container {
        padding: 12px;
      }
      .header {
        padding: 24px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${businessName}</h1>
      <div class="subtitle">Job Progress Report</div>
    </div>

    <div class="client-info">
      <h2>${clientName}</h2>
      ${contactParts.join('\n      ')}
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${fmtDuration(totalDuration)}</div>
        <div class="label">Total Hours</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatCurrencyAmount(totalBilled, currency)}</div>
        <div class="label">Total Billed</div>
      </div>
      <div class="summary-card">
        <div class="value">${sessionCount}</div>
        <div class="label">Sessions</div>
      </div>
    </div>

    ${sessionsHtml}
    ${invoicesHtml}
    ${materialsHtml}
    ${photosHtml}

    <div class="footer">
      Generated by <span class="app-name">HourFlow</span> on ${generatedDate}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate a shareable HTML client report and write it to the cache directory.
 * Returns the file URI.
 */
export async function generateClientReport(
  clientId: number,
  options: {
    includeSessions?: boolean;
    includeInvoices?: boolean;
    includeMaterials?: boolean;
    includePhotos?: boolean;
  } = {}
): Promise<string> {
  const data = await getReportData(clientId);

  const html = buildHtml(data, {
    includeSessions: options.includeSessions !== false,
    includeInvoices: options.includeInvoices !== false,
    includeMaterials: options.includeMaterials !== false,
    includePhotos: options.includePhotos !== false,
  });

  // Ensure the reports directory exists
  const reportsDir = new Directory(Paths.cache, 'reports');
  if (!reportsDir.exists) {
    reportsDir.create({ intermediates: true });
  }

  const fileName = `client-report-${clientId}-${Date.now()}.html`;
  const file = new File(reportsDir, fileName);
  file.write(html);

  return file.uri;
}

/**
 * Share the generated client report via the native share sheet
 */
export async function shareClientReport(fileUri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/html',
    dialogTitle: 'Share Client Report',
  });
}
