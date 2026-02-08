import { useState, useEffect, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { VoiceNote } from '../types';
import {
  getVoiceNotesBySessionId,
  createVoiceNote,
  deleteVoiceNote as deleteVoiceNoteRecord,
} from '../db/voiceNoteRepository';
import {
  startRecording as startRecordingService,
  stopRecording as stopRecordingService,
  saveRecordingToDocuments,
  deleteVoiceNoteFile,
  getVoiceNoteUri,
  createPlaybackSound,
} from '../services/voiceNoteService';

interface UseVoiceNotesResult {
  voiceNotes: VoiceNote[];
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Hook to load voice notes for a session.
 */
export function useVoiceNotes(sessionId: number | null): UseVoiceNotesResult {
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!sessionId) {
      setVoiceNotes([]);
      return;
    }
    setIsLoading(true);
    try {
      const result = await getVoiceNotesBySessionId(sessionId);
      setVoiceNotes(result);
    } catch (error) {
      console.error('Failed to load voice notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return { voiceNotes, isLoading, refresh: loadNotes };
}

interface UseVoiceNoteMutationsResult {
  startRecord: () => Promise<void>;
  stopAndSave: (sessionId: number) => Promise<VoiceNote | null>;
  removeNote: (voiceNote: VoiceNote) => Promise<void>;
  isRecording: boolean;
  isLoading: boolean;
}

/**
 * Hook for voice note record/delete operations.
 */
export function useVoiceNoteMutations(): UseVoiceNoteMutationsResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecord = useCallback(async () => {
    try {
      const recording = await startRecordingService();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, []);

  const stopAndSave = useCallback(async (sessionId: number): Promise<VoiceNote | null> => {
    if (!recordingRef.current) return null;
    setIsLoading(true);
    try {
      const { uri, durationSeconds } = await stopRecordingService(recordingRef.current);
      recordingRef.current = null;
      setIsRecording(false);

      const relativePath = saveRecordingToDocuments(uri, sessionId);
      const voiceNote = await createVoiceNote(sessionId, relativePath, durationSeconds);
      return voiceNote;
    } catch (error) {
      console.error('Failed to stop and save recording:', error);
      setIsRecording(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeNote = useCallback(async (voiceNote: VoiceNote): Promise<void> => {
    setIsLoading(true);
    try {
      deleteVoiceNoteFile(voiceNote.file_path);
      await deleteVoiceNoteRecord(voiceNote.id);
    } catch (error) {
      console.error('Failed to remove voice note:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { startRecord, stopAndSave, removeNote, isRecording, isLoading };
}

interface UseVoiceNotePlayerResult {
  play: (voiceNote: VoiceNote) => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  isPlaying: boolean;
  currentNoteId: number | null;
  positionSeconds: number;
  durationSeconds: number;
}

/**
 * Hook for voice note playback.
 */
export function useVoiceNotePlayer(): UseVoiceNotePlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [positionSeconds, setPositionSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    setCurrentNoteId(null);
    setPositionSeconds(0);
    setDurationSeconds(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const play = useCallback(async (voiceNote: VoiceNote) => {
    // If same note, toggle resume
    if (currentNoteId === voiceNote.id && soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      return;
    }

    // Stop existing playback
    await cleanup();

    const uri = getVoiceNoteUri(voiceNote.file_path);
    const { sound, durationSeconds: dur } = await createPlaybackSound(uri);
    soundRef.current = sound;
    setCurrentNoteId(voiceNote.id);
    setDurationSeconds(dur);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      setPositionSeconds(Math.round((status.positionMillis ?? 0) / 1000));
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPositionSeconds(0);
      }
    });

    await sound.playAsync();
    setIsPlaying(true);
  }, [currentNoteId, cleanup]);

  const pause = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(async () => {
    await cleanup();
  }, [cleanup]);

  return {
    play,
    pause,
    stop,
    isPlaying,
    currentNoteId,
    positionSeconds,
    durationSeconds,
  };
}
