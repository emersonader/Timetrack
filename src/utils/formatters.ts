import { format, parseISO, differenceInSeconds } from 'date-fns';
import { DATE_FORMATS } from './constants';

/**
 * Format currency with dollar sign
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format duration in seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to human readable (e.g., "2h 30m")
 */
export function formatDurationHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return 'Less than 1 min';
  }

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(' ');
}

/**
 * Convert seconds to hours (decimal)
 */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATE_FORMATS.display);
}

/**
 * Format date with time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATE_FORMATS.displayWithTime);
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATE_FORMATS.time);
}

/**
 * Format date for database storage (YYYY-MM-DD)
 */
export function formatDateForDb(date: Date): string {
  return format(date, DATE_FORMATS.database);
}

/**
 * Format date/time for database storage (ISO string)
 */
export function formatDateTimeForDb(date: Date): string {
  return date.toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return formatDateForDb(new Date());
}

/**
 * Calculate elapsed seconds from start time to now
 */
export function calculateElapsedSeconds(startTime: Date | string): number {
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  return differenceInSeconds(new Date(), start);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX if 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format as +X (XXX) XXX-XXXX if 11 digits
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return as-is if doesn't match expected format
  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
}

/**
 * Format client full name
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Format time range (e.g., "9:00 AM - 5:00 PM")
 */
export function formatTimeRange(
  startTime: Date | string,
  endTime: Date | string | null
): string {
  const start = formatTime(startTime);
  if (!endTime) {
    return `${start} - Ongoing`;
  }
  const end = formatTime(endTime);
  return `${start} - ${end}`;
}
