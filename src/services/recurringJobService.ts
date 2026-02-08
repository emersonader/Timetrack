import { format, addWeeks, addMonths, parseISO, isBefore, isEqual, startOfDay } from 'date-fns';
import {
  getActiveRecurringJobs,
  createOccurrence,
  updateLastGeneratedDate,
  getPendingOccurrencesUpTo,
  updateOccurrenceStatus,
} from '../db/recurringJobRepository';
import { createManualSession } from '../db/sessionRepository';
import { createInvoice } from '../db/invoiceRepository';
import { getClientById } from '../db/clientRepository';
import { secondsToHours } from '../utils/formatters';
import { RecurringJob } from '../types';

const MAX_OCCURRENCES_PER_JOB = 100;

/**
 * Calculate occurrence dates for a recurring job between two dates.
 */
function calculateDates(job: RecurringJob, fromDate: Date, toDate: Date): string[] {
  const dates: string[] = [];
  let cursor: Date;

  if (job.frequency === 'monthly') {
    // Start from the month of fromDate, using day_of_month
    const dayOfMonth = job.day_of_month ?? 1;
    cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), dayOfMonth);
    // If cursor is before fromDate, move to next month
    if (isBefore(cursor, fromDate)) {
      cursor = addMonths(cursor, 1);
    }
  } else {
    // Weekly/biweekly: find the next occurrence of day_of_week on or after fromDate
    cursor = new Date(fromDate);
    const currentDay = cursor.getDay();
    const targetDay = job.day_of_week;
    let daysToAdd = (targetDay - currentDay + 7) % 7;
    if (daysToAdd === 0 && isBefore(cursor, fromDate)) {
      daysToAdd = 7;
    }
    cursor.setDate(cursor.getDate() + daysToAdd);
  }

  while (
    (isBefore(cursor, toDate) || isEqual(startOfDay(cursor), startOfDay(toDate))) &&
    dates.length < MAX_OCCURRENCES_PER_JOB
  ) {
    // Respect end_date if set
    if (job.end_date && isBefore(parseISO(job.end_date), startOfDay(cursor))) {
      break;
    }

    dates.push(format(cursor, 'yyyy-MM-dd'));

    if (job.frequency === 'weekly') {
      cursor = addWeeks(cursor, 1);
    } else if (job.frequency === 'biweekly') {
      cursor = addWeeks(cursor, 2);
    } else {
      cursor = addMonths(cursor, 1);
    }
  }

  return dates;
}

/**
 * Generate occurrence rows for all active recurring jobs up to today.
 */
export async function generateOccurrences(): Promise<void> {
  const jobs = await getActiveRecurringJobs();
  const today = startOfDay(new Date());

  for (const job of jobs) {
    const fromDate = job.last_generated_date
      ? startOfDay(addWeeks(parseISO(job.last_generated_date), 0)) // day after last generated
      : startOfDay(parseISO(job.start_date));

    // If last_generated_date exists, start from the day after
    const adjustedFrom = job.last_generated_date
      ? new Date(fromDate.getTime() + 86400000) // +1 day
      : fromDate;

    const dates = calculateDates(job, adjustedFrom, today);

    for (const date of dates) {
      await createOccurrence(job.id, date);
    }

    if (dates.length > 0) {
      await updateLastGeneratedDate(job.id, dates[dates.length - 1]);
    }
  }
}

/**
 * Process all pending occurrences up to today: create sessions (and optionally invoices).
 */
export async function processPendingOccurrences(): Promise<void> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const pending = await getPendingOccurrencesUpTo(todayStr);

  for (const occ of pending) {
    try {
      // Create a time session
      const session = await createManualSession(
        occ.client_id,
        occ.duration_seconds,
        occ.scheduled_date,
        occ.job_notes ?? occ.job_title
      );

      let invoiceId: number | undefined;

      // Auto-invoice if enabled
      if (occ.auto_invoice) {
        const client = await getClientById(occ.client_id);
        if (client) {
          const hours = secondsToHours(occ.duration_seconds);
          const amount = hours * client.hourly_rate;
          const invoice = await createInvoice({
            client_id: occ.client_id,
            total_hours: hours,
            total_amount: amount,
            session_ids: [session.id],
            currency: client.currency,
          });
          invoiceId = invoice.id;
        }
      }

      await updateOccurrenceStatus(occ.id, 'completed', {
        session_id: session.id,
        invoice_id: invoiceId,
      });
    } catch (err) {
      console.error(`Failed to process occurrence ${occ.id}:`, err);
      // Continue with other occurrences
    }
  }
}

/**
 * Main entry point: generate occurrences then process pending ones.
 */
export async function processRecurringJobs(): Promise<void> {
  await generateOccurrences();
  await processPendingOccurrences();
}
