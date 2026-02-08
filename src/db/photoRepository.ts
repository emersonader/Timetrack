import { getDatabase } from './database';
import { Photo } from '../types';

/**
 * Get all photos for a given session.
 */
export async function getPhotosBySessionId(sessionId: number): Promise<Photo[]> {
  const db = await getDatabase();
  return db.getAllAsync<Photo>(
    'SELECT * FROM photos WHERE session_id = ? ORDER BY captured_at ASC',
    [sessionId]
  );
}

/**
 * Get photo count for a session (lightweight check).
 */
export async function getPhotoCountForSession(sessionId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM photos WHERE session_id = ?',
    [sessionId]
  );
  return row?.count ?? 0;
}

/**
 * Get all photos for a client (across all sessions).
 */
export async function getPhotosByClientId(clientId: number): Promise<Photo[]> {
  const db = await getDatabase();
  return db.getAllAsync<Photo>(
    `SELECT p.* FROM photos p
     JOIN time_sessions ts ON p.session_id = ts.id
     WHERE ts.client_id = ?
     ORDER BY p.captured_at DESC`,
    [clientId]
  );
}

/**
 * Create a photo record.
 */
export async function createPhoto(
  sessionId: number,
  filePath: string,
): Promise<Photo> {
  const db = await getDatabase();
  const capturedAt = new Date().toISOString();

  const result = await db.runAsync(
    'INSERT INTO photos (session_id, file_path, captured_at) VALUES (?, ?, ?)',
    [sessionId, filePath, capturedAt]
  );

  return {
    id: result.lastInsertRowId,
    session_id: sessionId,
    file_path: filePath,
    captured_at: capturedAt,
    created_at: capturedAt,
  };
}

/**
 * Delete a photo record by ID.
 */
export async function deletePhoto(photoId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM photos WHERE id = ?', [photoId]);
}

/**
 * Delete all photos for a session (used before file cleanup).
 */
export async function deletePhotosBySessionId(sessionId: number): Promise<string[]> {
  const db = await getDatabase();
  const photos = await db.getAllAsync<{ file_path: string }>(
    'SELECT file_path FROM photos WHERE session_id = ?',
    [sessionId]
  );
  await db.runAsync('DELETE FROM photos WHERE session_id = ?', [sessionId]);
  return photos.map(p => p.file_path);
}
