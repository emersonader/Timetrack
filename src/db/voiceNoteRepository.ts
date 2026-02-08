import { getDatabase } from './database';
import { VoiceNote } from '../types';

/**
 * Get all voice notes for a given session.
 */
export async function getVoiceNotesBySessionId(sessionId: number): Promise<VoiceNote[]> {
  const db = await getDatabase();
  return db.getAllAsync<VoiceNote>(
    'SELECT * FROM voice_notes WHERE session_id = ? ORDER BY recorded_at ASC',
    [sessionId]
  );
}

/**
 * Get voice note count for a session (lightweight check).
 */
export async function getVoiceNoteCountForSession(sessionId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM voice_notes WHERE session_id = ?',
    [sessionId]
  );
  return row?.count ?? 0;
}

/**
 * Create a voice note record.
 */
export async function createVoiceNote(
  sessionId: number,
  filePath: string,
  durationSeconds: number,
): Promise<VoiceNote> {
  const db = await getDatabase();
  const recordedAt = new Date().toISOString();

  const result = await db.runAsync(
    'INSERT INTO voice_notes (session_id, file_path, duration_seconds, recorded_at) VALUES (?, ?, ?, ?)',
    [sessionId, filePath, durationSeconds, recordedAt]
  );

  return {
    id: result.lastInsertRowId,
    session_id: sessionId,
    file_path: filePath,
    duration_seconds: durationSeconds,
    recorded_at: recordedAt,
    created_at: recordedAt,
  };
}

/**
 * Delete a voice note record by ID.
 */
export async function deleteVoiceNote(noteId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM voice_notes WHERE id = ?', [noteId]);
}

/**
 * Delete all voice notes for a session (used before file cleanup).
 */
export async function deleteVoiceNotesBySessionId(sessionId: number): Promise<string[]> {
  const db = await getDatabase();
  const notes = await db.getAllAsync<{ file_path: string }>(
    'SELECT file_path FROM voice_notes WHERE session_id = ?',
    [sessionId]
  );
  await db.runAsync('DELETE FROM voice_notes WHERE session_id = ?', [sessionId]);
  return notes.map(n => n.file_path);
}
