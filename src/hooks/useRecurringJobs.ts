import { useState, useEffect, useCallback } from 'react';
import {
  RecurringJob,
  RecurringJobOccurrence,
  CreateRecurringJobInput,
  UpdateRecurringJobInput,
} from '../types';
import {
  getAllRecurringJobs,
  getRecurringJobsByClientId,
  getOccurrencesByJobId,
  createRecurringJob,
  updateRecurringJob,
  deleteRecurringJob,
  updateOccurrenceStatus,
} from '../db/recurringJobRepository';

interface UseRecurringJobsResult {
  jobs: RecurringJob[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecurringJobs(): UseRecurringJobsResult {
  const [jobs, setJobs] = useState<RecurringJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getAllRecurringJobs();
      setJobs(result);
    } catch (err) {
      console.error('Error loading recurring jobs:', err);
      setError('Failed to load recurring jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { jobs, isLoading, error, refresh: load };
}

interface UseRecurringJobsByClientResult {
  jobs: RecurringJob[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecurringJobsByClient(clientId: number): UseRecurringJobsByClientResult {
  const [jobs, setJobs] = useState<RecurringJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getRecurringJobsByClientId(clientId);
      setJobs(result);
    } catch (err) {
      console.error('Error loading recurring jobs for client:', err);
      setError('Failed to load recurring jobs');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return { jobs, isLoading, error, refresh: load };
}

interface UseOccurrencesResult {
  occurrences: RecurringJobOccurrence[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOccurrences(jobId: number | null): UseOccurrencesResult {
  const [occurrences, setOccurrences] = useState<RecurringJobOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) {
      setOccurrences([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const result = await getOccurrencesByJobId(jobId);
      setOccurrences(result);
    } catch (err) {
      console.error('Error loading occurrences:', err);
      setError('Failed to load occurrences');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  return { occurrences, isLoading, error, refresh: load };
}

interface UseRecurringJobMutationsResult {
  createJob: (input: CreateRecurringJobInput) => Promise<RecurringJob>;
  updateJob: (id: number, input: UpdateRecurringJobInput) => Promise<RecurringJob>;
  deleteJob: (id: number) => Promise<void>;
  skipOccurrence: (occurrenceId: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useRecurringJobMutations(): UseRecurringJobMutationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createJob = useCallback(async (input: CreateRecurringJobInput): Promise<RecurringJob> => {
    try {
      setIsLoading(true);
      setError(null);
      return await createRecurringJob(input);
    } catch (err) {
      console.error('Error creating recurring job:', err);
      setError('Failed to create recurring job');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateJob = useCallback(async (id: number, input: UpdateRecurringJobInput): Promise<RecurringJob> => {
    try {
      setIsLoading(true);
      setError(null);
      return await updateRecurringJob(id, input);
    } catch (err) {
      console.error('Error updating recurring job:', err);
      setError('Failed to update recurring job');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteJob = useCallback(async (id: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteRecurringJob(id);
    } catch (err) {
      console.error('Error deleting recurring job:', err);
      setError('Failed to delete recurring job');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const skipOccurrence = useCallback(async (occurrenceId: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await updateOccurrenceStatus(occurrenceId, 'skipped');
    } catch (err) {
      console.error('Error skipping occurrence:', err);
      setError('Failed to skip occurrence');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createJob, updateJob, deleteJob, skipOccurrence, isLoading, error };
}
