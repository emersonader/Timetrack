import { getDatabase } from './database';
import { Tag } from '../types';

/**
 * Get all tags
 */
export async function getAllTags(): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>(
    'SELECT id, name, color, created_at FROM tags ORDER BY name ASC'
  );
}

/**
 * Create a new tag
 */
export async function createTag(name: string, color?: string): Promise<Tag> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO tags (name, color) VALUES (?, ?)',
    [name, color || '#6B7280']
  );

  const tag = await db.getFirstAsync<Tag>(
    'SELECT id, name, color, created_at FROM tags WHERE id = ?',
    [result.lastInsertRowId]
  );

  if (!tag) {
    throw new Error('Failed to create tag');
  }

  return tag;
}

/**
 * Delete a tag by ID
 */
export async function deleteTag(id: number): Promise<void> {
  const db = await getDatabase();
  // session_tags entries will be cascade-deleted
  await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
}

/**
 * Get tags for a specific session
 */
export async function getTagsForSession(sessionId: number): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>(
    `SELECT t.id, t.name, t.color, t.created_at
     FROM tags t
     INNER JOIN session_tags st ON t.id = st.tag_id
     WHERE st.session_id = ?
     ORDER BY t.name ASC`,
    [sessionId]
  );
}

/**
 * Set tags for a session (replaces existing tags)
 */
export async function setSessionTags(sessionId: number, tagIds: number[]): Promise<void> {
  const db = await getDatabase();

  // Delete existing tags for this session
  await db.runAsync('DELETE FROM session_tags WHERE session_id = ?', [sessionId]);

  // Insert new tags
  for (const tagId of tagIds) {
    await db.runAsync(
      'INSERT INTO session_tags (session_id, tag_id) VALUES (?, ?)',
      [sessionId, tagId]
    );
  }
}
