import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Receipt, CreateReceiptInput } from '../types';
import {
  getAllReceipts,
  getReceiptStats,
  createReceipt,
  updateReceipt as updateReceiptRepo,
  deleteReceipt,
} from '../db/receiptRepository';

export interface ReceiptWithClient extends Receipt {
  client_name: string | null;
}

export interface ReceiptStats {
  totalReceipts: number;
  totalAmount: number;
  unprocessedCount: number;
}

interface UseReceiptsResult {
  receipts: ReceiptWithClient[];
  stats: ReceiptStats;
  isLoading: boolean;
  error: string | null;
  addReceipt: (input: CreateReceiptInput) => Promise<number>;
  updateReceipt: (id: number, updates: Partial<CreateReceiptInput> & { is_processed?: number }) => Promise<void>;
  removeReceipt: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReceipts(): UseReceiptsResult {
  const [receipts, setReceipts] = useState<ReceiptWithClient[]>([]);
  const [stats, setStats] = useState<ReceiptStats>({
    totalReceipts: 0,
    totalAmount: 0,
    unprocessedCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [receiptData, statsData] = await Promise.all([
        getAllReceipts(),
        getReceiptStats(),
      ]);
      setReceipts(receiptData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load receipts:', err);
      setError('Failed to load receipts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const addReceipt = useCallback(async (input: CreateReceiptInput): Promise<number> => {
    const id = await createReceipt(input);
    await loadData();
    return id;
  }, [loadData]);

  const updateReceipt = useCallback(async (
    id: number,
    updates: Partial<CreateReceiptInput> & { is_processed?: number }
  ): Promise<void> => {
    await updateReceiptRepo(id, updates);
    await loadData();
  }, [loadData]);

  const removeReceipt = useCallback(async (id: number): Promise<void> => {
    await deleteReceipt(id);
    await loadData();
  }, [loadData]);

  return {
    receipts,
    stats,
    isLoading,
    error,
    addReceipt,
    updateReceipt,
    removeReceipt,
    refresh: loadData,
  };
}
