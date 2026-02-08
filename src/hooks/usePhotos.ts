import { useState, useEffect, useCallback } from 'react';
import { Photo } from '../types';
import {
  getPhotosBySessionId,
  createPhoto,
  deletePhoto as deletePhotoRecord,
} from '../db/photoRepository';
import {
  pickImageFromGallery,
  captureImageWithCamera,
  savePhotoToDocuments,
  deletePhotoFile,
} from '../services/photoService';

interface UsePhotosResult {
  photos: Photo[];
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Hook to load photos for a session.
 */
export function usePhotos(sessionId: number | null): UsePhotosResult {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!sessionId) {
      setPhotos([]);
      return;
    }
    setIsLoading(true);
    try {
      const result = await getPhotosBySessionId(sessionId);
      setPhotos(result);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  return { photos, isLoading, refresh: loadPhotos };
}

interface UsePhotoMutationsResult {
  addFromGallery: (sessionId: number) => Promise<Photo | null>;
  addFromCamera: (sessionId: number) => Promise<Photo | null>;
  removePhoto: (photo: Photo) => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook for photo add/delete operations.
 */
export function usePhotoMutations(): UsePhotoMutationsResult {
  const [isLoading, setIsLoading] = useState(false);

  const addFromGallery = useCallback(async (sessionId: number): Promise<Photo | null> => {
    setIsLoading(true);
    try {
      const uri = await pickImageFromGallery();
      if (!uri) return null;

      const relativePath = savePhotoToDocuments(uri, sessionId);
      const photo = await createPhoto(sessionId, relativePath);
      return photo;
    } catch (error) {
      console.error('Failed to add photo from gallery:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addFromCamera = useCallback(async (sessionId: number): Promise<Photo | null> => {
    setIsLoading(true);
    try {
      const uri = await captureImageWithCamera();
      if (!uri) return null;

      const relativePath = savePhotoToDocuments(uri, sessionId);
      const photo = await createPhoto(sessionId, relativePath);
      return photo;
    } catch (error) {
      console.error('Failed to add photo from camera:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removePhoto = useCallback(async (photo: Photo): Promise<void> => {
    setIsLoading(true);
    try {
      await deletePhotoFile(photo.file_path);
      await deletePhotoRecord(photo.id);
    } catch (error) {
      console.error('Failed to remove photo:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { addFromGallery, addFromCamera, removePhoto, isLoading };
}
