import { Audio } from 'expo-av';
import { File, Directory, Paths } from 'expo-file-system';

const VOICE_NOTES_DIR = 'voice_notes';

/**
 * Get the full URI for a voice note from its relative path.
 */
export function getVoiceNoteUri(relativePath: string): string {
  const file = new File(Paths.document, relativePath);
  return file.uri;
}

/**
 * Ensure the voice notes directory for a session exists.
 */
function ensureSessionDir(sessionId: number): Directory {
  const dir = new Directory(Paths.document, VOICE_NOTES_DIR, `session_${sessionId}`);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/**
 * Copy a recording to the app's persistent documents directory.
 * Returns the relative path for storage in the database.
 */
export function saveRecordingToDocuments(
  sourceUri: string,
  sessionId: number,
): string {
  const dir = ensureSessionDir(sessionId);
  const filename = `note_${Date.now()}.m4a`;
  const destFile = new File(dir, filename);
  const sourceFile = new File(sourceUri);

  sourceFile.copy(destFile);

  return `${VOICE_NOTES_DIR}/session_${sessionId}/${filename}`;
}

/**
 * Delete a voice note file from the documents directory.
 */
export function deleteVoiceNoteFile(relativePath: string): void {
  try {
    const file = new File(Paths.document, relativePath);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    console.error('Failed to delete voice note file:', e);
  }
}

/**
 * Delete all voice note files for a session.
 */
export function deleteSessionVoiceNoteFiles(sessionId: number): void {
  try {
    const dir = new Directory(Paths.document, VOICE_NOTES_DIR, `session_${sessionId}`);
    if (dir.exists) {
      dir.delete();
    }
  } catch (e) {
    console.error('Failed to delete session voice note directory:', e);
  }
}

/**
 * Start an audio recording. Requests mic permission and configures Audio mode.
 * Returns the Recording instance.
 */
export async function startRecording(): Promise<Audio.Recording> {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Microphone permission not granted');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );

  return recording;
}

/**
 * Stop an active recording and return the URI and duration.
 */
export async function stopRecording(
  recording: Audio.Recording,
): Promise<{ uri: string; durationSeconds: number }> {
  await recording.stopAndUnloadAsync();

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });

  const uri = recording.getURI();
  if (!uri) {
    throw new Error('Recording URI not available');
  }

  const status = await recording.getStatusAsync();
  const durationSeconds = Math.round((status.durationMillis ?? 0) / 1000);

  return { uri, durationSeconds };
}

/**
 * Create a Sound instance for playback from a URI.
 */
export async function createPlaybackSound(
  uri: string,
): Promise<{ sound: Audio.Sound; durationSeconds: number }> {
  const { sound, status } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: false }
  );

  const durationSeconds = status.isLoaded
    ? Math.round((status.durationMillis ?? 0) / 1000)
    : 0;

  return { sound, durationSeconds };
}
