import { useState, useEffect, useCallback } from 'react';
import { Client, CreateClientInput, UpdateClientInput } from '../types';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getRecentClients,
} from '../db/clientRepository';
import { searchClients } from '../utils/fuzzySearch';

interface UseClientsResult {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get all clients
 */
export function useClients(): UseClientsResult {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getAllClients();
      setClients(result);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return {
    clients,
    isLoading,
    error,
    refresh: loadClients,
  };
}

interface UseClientResult {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get a single client by ID
 */
export function useClient(clientId: number | null): UseClientResult {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClient = useCallback(async () => {
    if (!clientId) {
      setClient(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await getClientById(clientId);
      setClient(result);
    } catch (err) {
      console.error('Error loading client:', err);
      setError('Failed to load client');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  return {
    client,
    isLoading,
    error,
    refresh: loadClient,
  };
}

interface UseRecentClientsResult {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get recent clients
 */
export function useRecentClients(limit: number = 5): UseRecentClientsResult {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getRecentClients(limit);
      setClients(result);
    } catch (err) {
      console.error('Error loading recent clients:', err);
      setError('Failed to load recent clients');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return {
    clients,
    isLoading,
    error,
    refresh: loadClients,
  };
}

interface UseClientSearchResult {
  results: Client[];
  isSearching: boolean;
  search: (query: string) => void;
  clearSearch: () => void;
}

/**
 * Hook for client search with fuzzy matching
 */
export function useClientSearch(allClients: Client[]): UseClientSearchResult {
  const [results, setResults] = useState<Client[]>(allClients);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(
    (query: string) => {
      setIsSearching(true);
      const searchResults = searchClients(allClients, query);
      setResults(searchResults);
      setIsSearching(false);
    },
    [allClients]
  );

  const clearSearch = useCallback(() => {
    setResults(allClients);
  }, [allClients]);

  // Update results when allClients changes
  useEffect(() => {
    setResults(allClients);
  }, [allClients]);

  return {
    results,
    isSearching,
    search,
    clearSearch,
  };
}

interface UseClientMutationsResult {
  createClient: (input: CreateClientInput) => Promise<Client>;
  updateClient: (id: number, input: UpdateClientInput) => Promise<Client>;
  deleteClient: (id: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for client mutations (create, update, delete)
 */
export function useClientMutations(): UseClientMutationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (input: CreateClientInput): Promise<Client> => {
      try {
        setIsLoading(true);
        setError(null);
        const client = await createClient(input);
        return client;
      } catch (err) {
        console.error('Error creating client:', err);
        setError('Failed to create client');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleUpdate = useCallback(
    async (id: number, input: UpdateClientInput): Promise<Client> => {
      try {
        setIsLoading(true);
        setError(null);
        const client = await updateClient(id, input);
        return client;
      } catch (err) {
        console.error('Error updating client:', err);
        setError('Failed to update client');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleDelete = useCallback(async (id: number): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteClient(id);
    } catch (err) {
      console.error('Error deleting client:', err);
      setError('Failed to delete client');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createClient: handleCreate,
    updateClient: handleUpdate,
    deleteClient: handleDelete,
    isLoading,
    error,
  };
}
