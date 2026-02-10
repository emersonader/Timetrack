import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { QRCode, CreateQRCodeInput } from '../types';
import {
  getAllQRCodes,
  createQRCode,
  deleteQRCode,
} from '../db/qrCodeRepository';

interface QRCodeWithClient extends QRCode {
  client_first_name: string;
  client_last_name: string;
}

interface UseQRCodesResult {
  qrCodes: QRCodeWithClient[];
  isLoading: boolean;
  error: string | null;
  createCode: (input: CreateQRCodeInput) => Promise<void>;
  deleteCode: (id: number) => Promise<void>;
  refreshCodes: () => Promise<void>;
}

export function useQRCodes(): UseQRCodesResult {
  const [qrCodes, setQRCodes] = useState<QRCodeWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const codes = await getAllQRCodes();
      setQRCodes(codes);
    } catch (err) {
      console.error('Error loading QR codes:', err);
      setError('Failed to load QR codes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCodes();
    }, [loadCodes])
  );

  const createCode = useCallback(async (input: CreateQRCodeInput) => {
    try {
      setError(null);
      await createQRCode(input);
      await loadCodes();
    } catch (err) {
      console.error('Error creating QR code:', err);
      setError('Failed to create QR code');
      throw err;
    }
  }, [loadCodes]);

  const deleteCode = useCallback(async (id: number) => {
    try {
      setError(null);
      await deleteQRCode(id);
      await loadCodes();
    } catch (err) {
      console.error('Error deleting QR code:', err);
      setError('Failed to delete QR code');
      throw err;
    }
  }, [loadCodes]);

  return {
    qrCodes,
    isLoading,
    error,
    createCode,
    deleteCode,
    refreshCodes: loadCodes,
  };
}
