import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { Platform, Alert } from 'react-native';
import { InvoicePreview, UserSettings } from '../types';
import {
  generateInvoicePdf,
  generateInvoiceText,
} from './invoiceService';
import { formatCurrency, formatFullName } from '../utils/formatters';

/**
 * Check if sharing is available
 */
export async function isSharingAvailable(): Promise<boolean> {
  return await Sharing.isAvailableAsync();
}

/**
 * Share a file using the native share sheet
 */
export async function shareFile(
  fileUri: string,
  mimeType: string = 'application/pdf'
): Promise<void> {
  const available = await isSharingAvailable();

  if (!available) {
    Alert.alert('Error', 'Sharing is not available on this device');
    return;
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: 'Share Invoice',
  });
}

/**
 * Send invoice via email
 */
export async function sendInvoiceViaEmail(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): Promise<boolean> {
  try {
    const { client, totalAmount } = preview;
    const clientName = formatFullName(client.first_name, client.last_name);
    const businessName = settings?.business_name || 'HourFlow';

    // Check if mail composer is available
    const isAvailable = await MailComposer.isAvailableAsync();

    if (!isAvailable) {
      // Fallback to share sheet with PDF
      const pdfUri = await generateInvoicePdf(preview, customMessage, settings);
      await shareFile(pdfUri);
      return true;
    }

    // Generate PDF
    const pdfUri = await generateInvoicePdf(preview, customMessage, settings);

    // Build email content
    const subject = `Invoice from ${businessName}`;
    const body =
      `Dear ${clientName},\n\n` +
      `Please find attached your invoice for ${formatCurrency(totalAmount, client.currency)}.\n\n` +
      (customMessage ? `${customMessage}\n\n` : '') +
      `Thank you for your business!\n\n` +
      `Best regards` +
      (settings?.business_name ? `\n${settings.business_name}` : '');

    // Open email composer with recipient, subject, body, and PDF attachment
    await MailComposer.composeAsync({
      recipients: client.email ? [client.email] : [],
      subject,
      body,
      attachments: [pdfUri],
    });

    return true;
  } catch (error) {
    console.error('Error sending invoice via email:', error);
    throw error;
  }
}

/**
 * Send invoice via SMS
 */
export async function sendInvoiceViaSms(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): Promise<boolean> {
  try {
    const { client } = preview;

    // Generate text content
    const messageText = generateInvoiceText(preview, customMessage, settings);

    // Build SMS URL
    const smsUrl =
      Platform.OS === 'ios'
        ? `sms:${client.phone || ''}&body=${encodeURIComponent(messageText)}`
        : `sms:${client.phone || ''}?body=${encodeURIComponent(messageText)}`;

    const canOpen = await Linking.canOpenURL(smsUrl);

    if (!canOpen) {
      // Fallback: copy to clipboard or show alert
      Alert.alert(
        'SMS Not Available',
        'Unable to open SMS. Would you like to share the invoice instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              const pdfUri = await generateInvoicePdf(preview, undefined, settings);
              await shareFile(pdfUri);
            },
          },
        ]
      );
      return false;
    }

    await Linking.openURL(smsUrl);
    return true;
  } catch (error) {
    console.error('Error sending invoice via SMS:', error);
    throw error;
  }
}

/**
 * Open phone dialer
 */
export async function openPhoneDialer(phoneNumber: string): Promise<void> {
  const phoneUrl = `tel:${phoneNumber}`;
  const canOpen = await Linking.canOpenURL(phoneUrl);

  if (canOpen) {
    await Linking.openURL(phoneUrl);
  } else {
    Alert.alert('Error', 'Unable to open phone dialer');
  }
}

/**
 * Open email client
 */
export async function openEmailClient(
  email: string,
  subject?: string,
  body?: string
): Promise<void> {
  let emailUrl = `mailto:${email}`;

  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);

  if (params.length > 0) {
    emailUrl += `?${params.join('&')}`;
  }

  const canOpen = await Linking.canOpenURL(emailUrl);

  if (canOpen) {
    await Linking.openURL(emailUrl);
  } else {
    Alert.alert('Error', 'Unable to open email client');
  }
}

/**
 * Share text content
 */
export async function shareText(text: string): Promise<void> {
  // Use native share sheet for text
  try {
    const available = await isSharingAvailable();
    if (!available) {
      Alert.alert('Sharing unavailable', text);
      return;
    }

    // Create a temporary text file to share
    // Or use the clipboard as fallback
    Alert.alert('Invoice Text', text, [
      { text: 'OK' },
    ]);
  } catch (error) {
    console.error('Error sharing text:', error);
  }
}

/**
 * Share invoice (general - opens share sheet)
 */
export async function shareInvoice(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): Promise<void> {
  try {
    const pdfUri = await generateInvoicePdf(preview, customMessage, settings);
    await shareFile(pdfUri);
  } catch (error) {
    console.error('Error sharing invoice:', error);
    throw error;
  }
}

/**
 * Send invoice record copy to business email
 * This opens the email client with the PDF attached so the user can send a copy to themselves
 */
export async function sendInvoiceRecordCopy(
  preview: InvoicePreview,
  customMessage?: string,
  settings?: UserSettings | null
): Promise<boolean> {
  try {
    // Check if business email is configured
    const businessEmail = settings?.business_email;
    if (!businessEmail) {
      console.log('No business email configured, skipping record copy');
      return false;
    }

    const { client, totalAmount, invoiceDate } = preview;
    const clientName = formatFullName(client.first_name, client.last_name);
    const businessName = settings?.business_name || 'HourFlow';

    // Check if mail composer is available
    const isAvailable = await MailComposer.isAvailableAsync();

    // Generate PDF
    const pdfUri = await generateInvoicePdf(preview, customMessage, settings);

    // Build email content for the record
    const subject = `[Record] Invoice to ${clientName} - ${formatCurrency(totalAmount, client.currency)}`;
    const body =
      `Invoice Record Copy\n\n` +
      `Client: ${clientName}\n` +
      `Amount: ${formatCurrency(totalAmount, client.currency)}\n` +
      `Date: ${invoiceDate}\n\n` +
      `This is an automatic record of the invoice sent.\n` +
      `The PDF is attached for your records.\n\n` +
      `---\n` +
      `${businessName}`;

    if (isAvailable) {
      // Open email composer with business email, subject, body, and PDF attachment
      await MailComposer.composeAsync({
        recipients: [businessEmail],
        subject,
        body,
        attachments: [pdfUri],
      });
      return true;
    } else {
      // Just share the PDF if email client isn't available
      await shareFile(pdfUri);
      return true;
    }
  } catch (error) {
    console.error('Error sending invoice record copy:', error);
    return false;
  }
}
