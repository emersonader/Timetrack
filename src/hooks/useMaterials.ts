import { useState, useEffect, useCallback } from 'react';
import { Material, CreateMaterialInput, UpdateMaterialInput } from '../types';
import {
  getMaterialsByClientId,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  deleteAllMaterialsByClientId,
  getTotalMaterialCost,
} from '../db/materialRepository';

/**
 * Hook for fetching materials for a specific client
 */
export function useMaterials(clientId: number) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [materialsData, total] = await Promise.all([
        getMaterialsByClientId(clientId),
        getTotalMaterialCost(clientId),
      ]);
      setMaterials(materialsData);
      setTotalCost(total);
    } catch (err) {
      setError('Failed to load materials');
      console.error('Error fetching materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    totalCost,
    isLoading,
    error,
    refresh: fetchMaterials,
  };
}

/**
 * Hook for material mutations (create, update, delete)
 */
export function useMaterialMutations() {
  const [isLoading, setIsLoading] = useState(false);

  const addMaterial = useCallback(
    async (input: CreateMaterialInput): Promise<Material> => {
      setIsLoading(true);
      try {
        const material = await createMaterial(input);
        return material;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const editMaterial = useCallback(
    async (id: number, input: UpdateMaterialInput): Promise<Material> => {
      setIsLoading(true);
      try {
        const material = await updateMaterial(id, input);
        return material;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const removeMaterial = useCallback(async (id: number): Promise<void> => {
    setIsLoading(true);
    try {
      await deleteMaterial(id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllMaterials = useCallback(async (clientId: number): Promise<void> => {
    setIsLoading(true);
    try {
      await deleteAllMaterialsByClientId(clientId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    addMaterial,
    editMaterial,
    removeMaterial,
    clearAllMaterials,
    isLoading,
  };
}
