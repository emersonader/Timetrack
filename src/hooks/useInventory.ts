import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput } from '../types';
import {
  getAllCatalogItems,
  getLowStockItems,
  searchCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  adjustQuantity,
} from '../db/inventoryRepository';

export function useInventory() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allItems, lowStock] = await Promise.all([
        searchQuery.trim()
          ? searchCatalogItems(searchQuery.trim())
          : getAllCatalogItems(),
        getLowStockItems(),
      ]);
      setItems(allItems);
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // Reload on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Reload when search changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  const addItem = useCallback(async (input: CreateCatalogItemInput) => {
    await createCatalogItem(input);
    await loadData();
  }, [loadData]);

  const editItem = useCallback(async (id: number, input: UpdateCatalogItemInput) => {
    await updateCatalogItem(id, input);
    await loadData();
  }, [loadData]);

  const removeItem = useCallback(async (id: number) => {
    await deleteCatalogItem(id);
    await loadData();
  }, [loadData]);

  const adjustStock = useCallback(async (id: number, delta: number) => {
    await adjustQuantity(id, delta);
    await loadData();
  }, [loadData]);

  return {
    items,
    lowStockItems,
    isLoading,
    searchQuery,
    setSearchQuery,
    addItem,
    editItem,
    removeItem,
    adjustStock,
    refresh: loadData,
  };
}
