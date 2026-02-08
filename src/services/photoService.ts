import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';

const PHOTOS_DIR = 'photos';

/**
 * Get the full URI for a photo from its relative path.
 */
export function getPhotoUri(relativePath: string): string {
  const file = new File(Paths.document, relativePath);
  return file.uri;
}

/**
 * Ensure the photos directory for a session exists.
 */
function ensureSessionDir(sessionId: number): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR, `session_${sessionId}`);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/**
 * Pick an image from the device gallery.
 * Returns the local URI of the picked image, or null if cancelled.
 */
export async function pickImageFromGallery(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Capture a photo with the device camera.
 * Returns the local URI of the captured image, or null if cancelled.
 */
export async function captureImageWithCamera(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Copy a photo to the app's persistent documents directory.
 * Returns the relative path for storage in the database.
 */
export function savePhotoToDocuments(
  sourceUri: string,
  sessionId: number,
): string {
  const dir = ensureSessionDir(sessionId);
  const filename = `photo_${Date.now()}.jpg`;
  const destFile = new File(dir, filename);
  const sourceFile = new File(sourceUri);

  sourceFile.copy(destFile);

  // Return relative path for DB storage
  return `${PHOTOS_DIR}/session_${sessionId}/${filename}`;
}

/**
 * Delete a photo file from the documents directory.
 */
export function deletePhotoFile(relativePath: string): void {
  try {
    const file = new File(Paths.document, relativePath);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    console.error('Failed to delete photo file:', e);
  }
}

/**
 * Delete all photo files for a session.
 */
export function deleteSessionPhotoFiles(sessionId: number): void {
  try {
    const dir = new Directory(Paths.document, PHOTOS_DIR, `session_${sessionId}`);
    if (dir.exists) {
      dir.delete();
    }
  } catch (e) {
    console.error('Failed to delete session photo directory:', e);
  }
}
