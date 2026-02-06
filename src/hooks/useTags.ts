import { useState, useEffect, useCallback } from 'react';
import { Tag } from '../types';
import {
  getAllTags,
  createTag as createTagDb,
  deleteTag as deleteTagDb,
  getTagsForSession,
  setSessionTags as setSessionTagsDb,
} from '../db/tagRepository';

interface UseTagsResult {
  tags: Tag[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag>;
  deleteTag: (id: number) => Promise<void>;
}

/**
 * Hook to get all available tags
 */
export function useTags(): UseTagsResult {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTags = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getAllTags();
      setTags(result);
    } catch (err) {
      console.error('Error loading tags:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreateTag = useCallback(async (name: string, color?: string): Promise<Tag> => {
    const tag = await createTagDb(name, color);
    await loadTags();
    return tag;
  }, [loadTags]);

  const handleDeleteTag = useCallback(async (id: number): Promise<void> => {
    await deleteTagDb(id);
    await loadTags();
  }, [loadTags]);

  return {
    tags,
    isLoading,
    refresh: loadTags,
    createTag: handleCreateTag,
    deleteTag: handleDeleteTag,
  };
}

interface UseSessionTagsResult {
  tags: Tag[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  setTags: (tagIds: number[]) => Promise<void>;
}

/**
 * Hook to get and manage tags for a specific session
 */
export function useSessionTags(sessionId: number | null): UseSessionTagsResult {
  const [tags, setTagsState] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTags = useCallback(async () => {
    if (!sessionId) {
      setTagsState([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await getTagsForSession(sessionId);
      setTagsState(result);
    } catch (err) {
      console.error('Error loading session tags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleSetTags = useCallback(async (tagIds: number[]): Promise<void> => {
    if (!sessionId) return;
    await setSessionTagsDb(sessionId, tagIds);
    await loadTags();
  }, [sessionId, loadTags]);

  return {
    tags,
    isLoading,
    refresh: loadTags,
    setTags: handleSetTags,
  };
}
