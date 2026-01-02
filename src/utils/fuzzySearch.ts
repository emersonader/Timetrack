import Fuse, { IFuseOptions } from 'fuse.js';
import { Client } from '../types';

// Fuse.js options for client search
const fuseOptions: IFuseOptions<Client> = {
  keys: [
    { name: 'first_name', weight: 0.3 },
    { name: 'last_name', weight: 0.3 },
    { name: 'phone', weight: 0.15 },
    { name: 'address', weight: 0.15 },
    { name: 'email', weight: 0.1 },
  ],
  threshold: 0.4, // Lower = more strict matching
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 1,
};

/**
 * Create a Fuse instance for searching clients
 */
export function createClientSearcher(clients: Client[]): Fuse<Client> {
  return new Fuse(clients, fuseOptions);
}

/**
 * Search clients with fuzzy matching
 */
export function searchClients(
  clients: Client[],
  query: string
): Client[] {
  if (!query || query.trim().length === 0) {
    return clients;
  }

  const fuse = createClientSearcher(clients);
  const results = fuse.search(query.trim());

  return results.map((result) => result.item);
}

/**
 * Search clients with score (for debugging/advanced use)
 */
export function searchClientsWithScore(
  clients: Client[],
  query: string
): Array<{ client: Client; score: number }> {
  if (!query || query.trim().length === 0) {
    return clients.map((client) => ({ client, score: 0 }));
  }

  const fuse = createClientSearcher(clients);
  const results = fuse.search(query.trim());

  return results.map((result) => ({
    client: result.item,
    score: result.score ?? 0,
  }));
}

/**
 * Filter clients by exact match on a field
 */
export function filterClientsByField<K extends keyof Client>(
  clients: Client[],
  field: K,
  value: Client[K]
): Client[] {
  return clients.filter((client) => client[field] === value);
}

/**
 * Sort clients by full name alphabetically
 */
export function sortClientsByName(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sort clients by most recently updated
 */
export function sortClientsByRecent(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => {
    const dateA = new Date(a.updated_at).getTime();
    const dateB = new Date(b.updated_at).getTime();
    return dateB - dateA;
  });
}
