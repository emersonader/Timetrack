import * as Print from 'expo-print';
import { Client, TimeSession, SessionWithBillable, InvoicePreview, Material, UserSettings } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDurationHuman,
  formatTimeRange,
  secondsToHours,
  formatFullName,
} from '../utils/formatters';
import { addDays, format } from 'date-fns';
import { COLORS } from '../utils/constants';

const DEFAULT_ACCENT_COLOR = '#2563EB';

/**
 * Generate payment links HTML section
 */
function generatePaymentLinksHtml(settings: UserSettings | null | undefined, amount: number): string {
  if (!settings) return '';

  const paymentMethods: string[] = [];

  if (settings.paypal_enabled && settings.paypal_username) {
    const paypalLink = `https://paypal.me/${settings.paypal_username}/${amount.toFixed(2)}`;
    paymentMethods.push(`
      <a href="${paypalLink}" class="payment-btn paypal">
        <span class="payment-icon">P</span>
        Pay with PayPal
      </a>
    `);
  }

  if (settings.venmo_enabled && settings.venmo_username) {
    const venmoLink = `https://venmo.com/${settings.venmo_username}?txn=pay&amount=${amount.toFixed(2)}`;
    paymentMethods.push(`
      <a href="${venmoLink}" class="payment-btn venmo">
        <span class="payment-icon">V</span>
        Pay with Venmo
      </a>
    `);
  }

  if (settings.zelle_enabled && settings.zelle_id) {
    paymentMethods.push(`
      <div class="payment-info zelle">
        <span class="payment-icon">Z</span>
        <span>Pay with Zelle: <strong>${settings.zelle_id}</strong></span>
      </div>
    `);
  }

  if (settings.cashapp_enabled && settings.cashapp_tag) {
    const cashappLink = `https://cash.app/$${settings.cashapp_tag}/${amount.toFixed(2)}`;
    paymentMethods.push(`
      <a href="${cashappLink}" class="payment-btn cashapp">
        <span class="payment-icon">$</span>
        Pay with Cash App
      </a>
    `);
  }

  if (settings.stripe_enabled && settings.stripe_payment_link) {
    paymentMethods.push(`
      <a href="${settings.stripe_payment_link}" class="payment-btn stripe">
        <span class="payment-icon">S</span>
        Pay with Card / Apple Pay / Google Pay
      </a>
    `);
  }

  if (paymentMethods.length === 0) return '';

  return `
    <div class="payment-section">
      <h3>Payment Options</h3>
      <div class="payment-buttons">
        ${paymentMethods.join('')}
      </div>
    </div>
  `;
}

/**
 * Generate payment links for plain text (SMS)
 */
function generatePaymentLinksText(settings: UserSettings | null | undefined, amount: number): string {
  if (!settings) return '';

  const links: string[] = [];

  if (settings.paypal_enabled && settings.paypal_username) {
    links.push(`PayPal: paypal.me/${settings.paypal_username}/${amount.toFixed(2)}`);
  }

  if (settings.venmo_enabled && settings.venmo_username) {
    links.push(`Venmo: venmo.com/${settings.venmo_username}`);
  }

  if (settings.zelle_enabled && settings.zelle_id) {
    links.push(`Zelle: ${settings.zelle_id}`);
  }

  if (settings.cashapp_enabled && settings.cashapp_tag) {
    links.push(`Cash App: cash.app/$${settings.cashapp_tag}`);
  }

  if (settings.stripe_enabled && settings.stripe_payment_link) {
    links.push(`Card/Apple Pay: ${settings.stripe_payment_link}`);
  }

  if (links.length === 0) return '';

  return `\nPayment Options:\n${links.map(l => `• ${l}`).join('\n')}\n`;
}

/**
 * Generate invoice preview data
 */
export function generateInvoicePreview(
  client: Client,
  sessions: TimeSession[] | SessionWithBillable[],
  materials: Material[] = [],
  dueDateDays: number = 30
): InvoicePreview {
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = secondsToHours(totalSeconds);
  const totalLaborAmount = totalHours * client.hourly_rate;
  const totalMaterialsAmount = materials.reduce((sum, m) => sum + m.cost, 0);
  const totalAmount = totalLaborAmount + totalMaterialsAmount;
  const invoiceDate = format(new Date(), 'yyyy-MM-dd');
  const dueDate = format(addDays(new Date(), dueDateDays), 'yyyy-MM-dd');

  // Convert to SessionWithBillable if needed
  const sessionsWithBillable: SessionWithBillable[] = sessions.map((session) => {
    if ('billable_amount' in session) {
      return session;
    }
    const hours = secondsToHours(session.duration);
    return {
      ...session,
      billable_amount: hours * client.hourly_rate,
    };
  });

  return {
    client,
    sessions: sessionsWithBillable,
    materials,
    totalHours,
    totalLaborAmount,
    totalMaterialsAmount,
    totalAmount,
    invoiceDate,
    dueDate,
  };
}

/**
 * Generate HTML for invoice
 */
export function generateInvoiceHtml(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): string {
  const { client, sessions, materials, totalHours, totalLaborAmount, totalMaterialsAmount, totalAmount, invoiceDate, dueDate } =
    preview;
  const clientName = formatFullName(client.first_name, client.last_name);

  // Use settings for customization or defaults
  const accentColor = settings?.accent_color || DEFAULT_ACCENT_COLOR;
  const businessName = settings?.business_name || 'Invoice';
  const hasBusinessInfo = settings?.business_name || settings?.business_phone || settings?.business_email || settings?.business_street;

  const sessionsHtml = sessions
    .map((session) => {
      const hours = secondsToHours(session.duration);
      const amount = hours * client.hourly_rate;
      return `
        <tr>
          <td>${formatDate(session.date)}</td>
          <td>${formatTimeRange(session.start_time, session.end_time)}</td>
          <td>${formatDurationHuman(session.duration)}</td>
          <td>${formatCurrency(amount)}</td>
        </tr>
      `;
    })
    .join('');

  const materialsHtml = materials
    .map((material) => {
      return `
        <tr>
          <td colspan="3">${material.name}</td>
          <td>${formatCurrency(material.cost)}</td>
        </tr>
      `;
    })
    .join('');

  // Build business info HTML
  const businessInfoHtml = hasBusinessInfo ? `
    <div class="party">
      <div class="party-label">From</div>
      ${settings?.business_name ? `<div class="party-name">${settings.business_name}</div>` : ''}
      ${settings?.business_email ? `<div class="party-detail">${settings.business_email}</div>` : ''}
      ${settings?.business_phone ? `<div class="party-detail">${settings.business_phone}</div>` : ''}
      ${settings?.business_street ? `<div class="party-detail">${settings.business_street}, ${settings.business_city}, ${settings.business_state} ${settings.business_zip}</div>` : ''}
    </div>
  ` : '';

  // Build logo HTML
  const logoHtml = settings?.logo_uri ? `
    <img src="${settings.logo_uri}" alt="Logo" style="max-width: 80px; max-height: 80px; object-fit: contain; margin-right: 16px;" />
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1F2937;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid ${accentColor};
          padding-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: ${accentColor};
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-number {
          font-size: 20px;
          font-weight: bold;
          color: #374151;
        }
        .invoice-date {
          color: #6B7280;
          margin-top: 4px;
        }
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          gap: 40px;
        }
        .party {
          flex: 1;
        }
        .party-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #6B7280;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .party-name {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .party-detail {
          color: #6B7280;
          font-size: 14px;
          line-height: 1.5;
        }
        .table-container {
          margin-bottom: 40px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background-color: #F3F4F6;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          color: #6B7280;
          letter-spacing: 0.5px;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #E5E7EB;
        }
        .summary {
          margin-left: auto;
          width: 300px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #E5E7EB;
        }
        .summary-row.total {
          font-size: 18px;
          font-weight: bold;
          border-bottom: none;
          border-top: 2px solid ${accentColor};
          padding-top: 12px;
          margin-top: 8px;
        }
        .summary-label {
          color: #6B7280;
        }
        .due-date {
          background-color: #FEF3C7;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 40px;
        }
        .due-date-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #92400E;
          margin-bottom: 4px;
        }
        .due-date-value {
          font-size: 16px;
          font-weight: 600;
          color: #92400E;
        }
        .message {
          background-color: #F9FAFB;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 40px;
        }
        .message-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #6B7280;
          margin-bottom: 8px;
        }
        .footer {
          text-align: center;
          color: #9CA3AF;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
        }
        .payment-section {
          margin-top: 40px;
          padding: 24px;
          background-color: #F9FAFB;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }
        .payment-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #374151;
          text-align: center;
        }
        .payment-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }
        .payment-btn, .payment-info {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        .payment-btn:hover {
          opacity: 0.9;
        }
        .payment-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 14px;
          color: white;
        }
        .payment-btn.paypal {
          background-color: #003087;
          color: white;
        }
        .payment-btn.paypal .payment-icon {
          background-color: rgba(255,255,255,0.2);
        }
        .payment-btn.venmo {
          background-color: #3D95CE;
          color: white;
        }
        .payment-btn.venmo .payment-icon {
          background-color: rgba(255,255,255,0.2);
        }
        .payment-info.zelle {
          background-color: #6D1ED4;
          color: white;
        }
        .payment-info.zelle .payment-icon {
          background-color: rgba(255,255,255,0.2);
        }
        .payment-btn.cashapp {
          background-color: #00D632;
          color: white;
        }
        .payment-btn.cashapp .payment-icon {
          background-color: rgba(255,255,255,0.2);
        }
        .payment-btn.stripe {
          background-color: #635BFF;
          color: white;
        }
        .payment-btn.stripe .payment-icon {
          background-color: rgba(255,255,255,0.2);
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${logoHtml}
          <div class="logo">${businessName}</div>
        </div>
        <div class="invoice-info">
          <div class="invoice-number">INVOICE</div>
          <div class="invoice-date">${formatDate(invoiceDate)}</div>
        </div>
      </div>

      <div class="parties">
        ${businessInfoHtml}
        <div class="party">
          <div class="party-label">Bill To</div>
          <div class="party-name">${clientName}</div>
          ${client.email ? `<div class="party-detail">${client.email}</div>` : ''}
          ${client.phone ? `<div class="party-detail">${client.phone}</div>` : ''}
          ${client.street ? `<div class="party-detail">${client.street}, ${client.city}, ${client.state} ${client.zip_code}</div>` : ''}
        </div>
      </div>

      <div class="due-date">
        <div class="due-date-label">Payment Due</div>
        <div class="due-date-value">${formatDate(dueDate)}</div>
      </div>

      ${sessions.length > 0 ? `
      <div class="table-container">
        <h3 style="margin-bottom: 12px; color: #374151;">Labor</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${sessionsHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${materials.length > 0 ? `
      <div class="table-container">
        <h3 style="margin-bottom: 12px; color: #374151;">Materials & Costs</h3>
        <table>
          <thead>
            <tr>
              <th colspan="3">Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${materialsHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="summary">
        ${sessions.length > 0 ? `
        <div class="summary-row">
          <span class="summary-label">Total Time</span>
          <span>${formatDurationHuman(totalHours * 3600)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Hourly Rate</span>
          <span>${formatCurrency(client.hourly_rate)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Labor Subtotal</span>
          <span>${formatCurrency(totalLaborAmount)}</span>
        </div>
        ` : ''}
        ${materials.length > 0 ? `
        <div class="summary-row">
          <span class="summary-label">Materials Subtotal</span>
          <span>${formatCurrency(totalMaterialsAmount)}</span>
        </div>
        ` : ''}
        <div class="summary-row total">
          <span>Total Due</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
      </div>

      ${generatePaymentLinksHtml(settings, totalAmount)}

      ${
        customMessage
          ? `
        <div class="message">
          <div class="message-label">Note</div>
          <div>${customMessage}</div>
        </div>
      `
          : ''
      }

      <div class="footer">
        ${settings?.business_name ? `${settings.business_name}` : 'Generated with Job Time Tracker'}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate a PDF from invoice preview
 */
export async function generateInvoicePdf(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): Promise<string> {
  const html = generateInvoiceHtml(preview, customMessage, settings);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

/**
 * Print invoice directly
 */
export async function printInvoice(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): Promise<void> {
  const html = generateInvoiceHtml(preview, customMessage, settings);
  await Print.printAsync({ html });
}

/**
 * Generate plain text invoice summary (for SMS)
 */
export function generateInvoiceText(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): string {
  const { client, totalHours, totalLaborAmount, totalMaterialsAmount, totalAmount, sessions, materials } = preview;
  const clientName = formatFullName(client.first_name, client.last_name);
  const businessName = settings?.business_name;

  let text = businessName ? `${businessName}\n\n` : '';
  text += `Invoice for ${clientName}\n\n`;

  if (sessions.length > 0) {
    text += `Labor: ${formatDurationHuman(totalHours * 3600)} @ ${formatCurrency(client.hourly_rate)}/hr = ${formatCurrency(totalLaborAmount)}\n`;
  }

  if (materials.length > 0) {
    text += `Materials: ${formatCurrency(totalMaterialsAmount)}\n`;
  }

  text += `\nTotal Due: ${formatCurrency(totalAmount)}\n`;

  // Add payment links
  const paymentLinks = generatePaymentLinksText(settings, totalAmount);
  if (paymentLinks) {
    text += paymentLinks;
  }

  text += '\n';

  if (customMessage) {
    text += `${customMessage}\n\n`;
  }

  text += `Thank you for your business!`;
  if (businessName) {
    text += `\n- ${businessName}`;
  }

  return text;
}
