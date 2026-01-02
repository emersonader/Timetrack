import {
  getActiveTimer,
  getActiveSession,
  clearActiveTimer,
  stopSession,
} from '../db/sessionRepository';
import { ActiveTimer, TimeSession } from '../types';

export interface TimerRecoveryState {
  hasActiveTimer: boolean;
  activeTimer: ActiveTimer | null;
  activeSession: TimeSession | null;
  elapsedSeconds: number;
}

/**
 * Check if there's an active timer from a previous session
 */
export async function checkForActiveTimer(): Promise<TimerRecoveryState> {
  try {
    const activeTimer = await getActiveTimer();

    if (!activeTimer || !activeTimer.is_running) {
      return {
        hasActiveTimer: false,
        activeTimer: null,
        activeSession: null,
        elapsedSeconds: 0,
      };
    }

    const activeSession = await getActiveSession();

    if (!activeSession || !activeTimer.start_time) {
      // Inconsistent state - clean up
      await clearActiveTimer();
      return {
        hasActiveTimer: false,
        activeTimer: null,
        activeSession: null,
        elapsedSeconds: 0,
      };
    }

    // Calculate elapsed time
    const startTime = new Date(activeTimer.start_time);
    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - startTime.getTime()) / 1000
    );

    return {
      hasActiveTimer: true,
      activeTimer,
      activeSession,
      elapsedSeconds,
    };
  } catch (error) {
    console.error('Error checking for active timer:', error);
    return {
      hasActiveTimer: false,
      activeTimer: null,
      activeSession: null,
      elapsedSeconds: 0,
    };
  }
}

/**
 * Recover and stop an orphaned timer
 */
export async function recoverAndStopTimer(): Promise<TimeSession | null> {
  try {
    const { hasActiveTimer, activeSession } = await checkForActiveTimer();

    if (!hasActiveTimer || !activeSession) {
      return null;
    }

    // Stop the session
    const stoppedSession = await stopSession(activeSession.id);
    return stoppedSession;
  } catch (error) {
    console.error('Error recovering timer:', error);
    await clearActiveTimer();
    return null;
  }
}

/**
 * Clean up any orphaned timer state
 */
export async function cleanupOrphanedTimers(): Promise<void> {
  try {
    const activeTimer = await getActiveTimer();
    const activeSession = await getActiveSession();

    // If timer says running but no active session, clean up
    if (activeTimer?.is_running && !activeSession) {
      await clearActiveTimer();
    }

    // If there's an active session but timer is not running, stop the session
    if (activeSession && !activeTimer?.is_running) {
      await stopSession(activeSession.id);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned timers:', error);
  }
}

/**
 * Get the current elapsed time for an active timer
 */
export function getElapsedTime(startTime: string | Date): number {
  const start =
    typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 1000);
}
