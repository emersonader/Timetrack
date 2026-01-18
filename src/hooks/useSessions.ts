import { useState, useEffect, useCallback } from 'react';
import { TimeSession, SessionWithBillable, GroupedSessions } from '../types';
import {
  getSessionsByClientId,
  getUnbilledSessions,
  getSessionsGroupedByDate,
  getTotalDurationForClient,
  deleteSession,
  createManualSession,
  deleteAllSessionsForClient,
  updateSession,
} from '../db/sessionRepository';
import { getClientById } from '../db/clientRepository';
import { secondsToHours } from '../utils/formatters';

interface UseSessionsResult {
  sessions: TimeSession[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get all sessions for a client
 */
export function useSessions(clientId: number | null): UseSessionsResult {
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!clientId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await getSessionsByClientId(clientId);
      setSessions(result);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    isLoading,
    error,
    refresh: loadSessions,
  };
}

interface UseSessionsWithBillableResult {
  sessions: SessionWithBillable[];
  totalDuration: number;
  totalBillable: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get sessions with billable amounts
 */
export function useSessionsWithBillable(
  clientId: number | null
): UseSessionsWithBillableResult {
  const [sessions, setSessions] = useState<SessionWithBillable[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalBillable, setTotalBillable] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!clientId) {
      setSessions([]);
      setTotalDuration(0);
      setTotalBillable(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [rawSessions, client] = await Promise.all([
        getSessionsByClientId(clientId),
        getClientById(clientId),
      ]);

      if (!client) {
        throw new Error('Client not found');
      }

      const hourlyRate = client.hourly_rate;
      let totalDur = 0;
      let totalBill = 0;

      const sessionsWithBillable: SessionWithBillable[] = rawSessions.map(
        (session) => {
          const hours = secondsToHours(session.duration);
          const billableAmount = hours * hourlyRate;
          totalDur += session.duration;
          totalBill += billableAmount;

          return {
            ...session,
            billable_amount: billableAmount,
          };
        }
      );

      setSessions(sessionsWithBillable);
      setTotalDuration(totalDur);
      setTotalBillable(totalBill);
    } catch (err) {
      console.error('Error loading sessions with billable:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    totalDuration,
    totalBillable,
    isLoading,
    error,
    refresh: loadSessions,
  };
}

interface UseUnbilledSessionsResult {
  sessions: SessionWithBillable[];
  totalDuration: number;
  totalBillable: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get unbilled sessions for invoicing
 */
export function useUnbilledSessions(
  clientId: number | null
): UseUnbilledSessionsResult {
  const [sessions, setSessions] = useState<SessionWithBillable[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalBillable, setTotalBillable] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!clientId) {
      setSessions([]);
      setTotalDuration(0);
      setTotalBillable(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [rawSessions, client] = await Promise.all([
        getUnbilledSessions(clientId),
        getClientById(clientId),
      ]);

      if (!client) {
        throw new Error('Client not found');
      }

      const hourlyRate = client.hourly_rate;
      let totalDur = 0;
      let totalBill = 0;

      const sessionsWithBillable: SessionWithBillable[] = rawSessions.map(
        (session) => {
          const hours = secondsToHours(session.duration);
          const billableAmount = hours * hourlyRate;
          totalDur += session.duration;
          totalBill += billableAmount;

          return {
            ...session,
            billable_amount: billableAmount,
          };
        }
      );

      setSessions(sessionsWithBillable);
      setTotalDuration(totalDur);
      setTotalBillable(totalBill);
    } catch (err) {
      console.error('Error loading unbilled sessions:', err);
      setError('Failed to load unbilled sessions');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    totalDuration,
    totalBillable,
    isLoading,
    error,
    refresh: loadSessions,
  };
}

interface UseGroupedSessionsResult {
  groupedSessions: GroupedSessions[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get sessions grouped by date
 */
export function useGroupedSessions(
  clientId: number | null
): UseGroupedSessionsResult {
  const [groupedSessions, setGroupedSessions] = useState<GroupedSessions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!clientId) {
      setGroupedSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [rawGrouped, client] = await Promise.all([
        getSessionsGroupedByDate(clientId),
        getClientById(clientId),
      ]);

      if (!client) {
        throw new Error('Client not found');
      }

      const hourlyRate = client.hourly_rate;

      const grouped: GroupedSessions[] = rawGrouped.map(({ date, sessions }) => {
        let totalDuration = 0;
        let totalBillable = 0;

        const sessionsWithBillable: SessionWithBillable[] = sessions.map(
          (session) => {
            const hours = secondsToHours(session.duration);
            const billableAmount = hours * hourlyRate;
            totalDuration += session.duration;
            totalBillable += billableAmount;

            return {
              ...session,
              billable_amount: billableAmount,
            };
          }
        );

        return {
          date,
          sessions: sessionsWithBillable,
          totalDuration,
          totalBillable,
        };
      });

      setGroupedSessions(grouped);
    } catch (err) {
      console.error('Error loading grouped sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    groupedSessions,
    isLoading,
    error,
    refresh: loadSessions,
  };
}

interface UpdateSessionInput {
  start_time?: string;
  end_time?: string;
  duration?: number;
  date?: string;
  notes?: string;
}

interface UseSessionMutationsResult {
  deleteSession: (sessionId: number) => Promise<void>;
  addManualSession: (clientId: number, durationSeconds: number, date?: string, notes?: string) => Promise<TimeSession>;
  clearAllSessions: (clientId: number) => Promise<number>;
  updateSessionData: (sessionId: number, updates: UpdateSessionInput) => Promise<TimeSession>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for session mutations
 */
export function useSessionMutations(): UseSessionMutationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(async (sessionId: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteSession(sessionId);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddManual = useCallback(async (
    clientId: number,
    durationSeconds: number,
    date?: string,
    notes?: string
  ): Promise<TimeSession> => {
    try {
      setIsLoading(true);
      setError(null);
      const session = await createManualSession(clientId, durationSeconds, date, notes);
      return session;
    } catch (err) {
      console.error('Error creating manual session:', err);
      setError('Failed to create manual session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearAll = useCallback(async (clientId: number): Promise<number> => {
    try {
      setIsLoading(true);
      setError(null);
      const count = await deleteAllSessionsForClient(clientId);
      return count;
    } catch (err) {
      console.error('Error clearing sessions:', err);
      setError('Failed to clear sessions');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateSession = useCallback(async (
    sessionId: number,
    updates: UpdateSessionInput
  ): Promise<TimeSession> => {
    try {
      setIsLoading(true);
      setError(null);
      const session = await updateSession(sessionId, updates);
      return session;
    } catch (err) {
      console.error('Error updating session:', err);
      setError('Failed to update session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    deleteSession: handleDelete,
    addManualSession: handleAddManual,
    clearAllSessions: handleClearAll,
    updateSessionData: handleUpdateSession,
    isLoading,
    error,
  };
}

/**
 * Hook to get total time tracked for a client
 */
export function useTotalDuration(clientId: number | null): {
  totalDuration: number;
  isLoading: boolean;
} {
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDuration = async () => {
      if (!clientId) {
        setTotalDuration(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const duration = await getTotalDurationForClient(clientId);
        setTotalDuration(duration);
      } catch (err) {
        console.error('Error loading total duration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDuration();
  }, [clientId]);

  return { totalDuration, isLoading };
}
