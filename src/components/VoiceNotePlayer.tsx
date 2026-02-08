import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceNote } from '../types';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../utils/constants';

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface VoiceNotePlayerProps {
  voiceNotes: VoiceNote[];
  onRecord: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onPlay: (voiceNote: VoiceNote) => Promise<void>;
  onPause: () => Promise<void>;
  onDelete: (voiceNote: VoiceNote) => void;
  isRecording: boolean;
  isPlaying: boolean;
  currentNoteId: number | null;
  positionSeconds: number;
  durationSeconds: number;
  isLoading?: boolean;
  isPro: boolean;
  onUpgrade: () => void;
}

export function VoiceNotePlayer({
  voiceNotes,
  onRecord,
  onStopRecording,
  onPlay,
  onPause,
  onDelete,
  isRecording,
  isPlaying,
  currentNoteId,
  positionSeconds,
  durationSeconds,
  isLoading,
  isPro,
  onUpgrade,
}: VoiceNotePlayerProps) {
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordingElapsed(0);
      timerRef.current = setInterval(() => {
        setRecordingElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingElapsed(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const handleLongPress = (voiceNote: VoiceNote) => {
    Alert.alert('Delete Voice Note', 'Remove this voice note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(voiceNote),
      },
    ]);
  };

  const handleRecordPress = () => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    if (isRecording) {
      onStopRecording();
    } else {
      onRecord();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="mic-outline" size={16} color={COLORS.gray500} />
          <Text style={styles.headerTitle}>
            Voice Notes{voiceNotes.length > 0 ? ` (${voiceNotes.length})` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={handleRecordPress}
          disabled={isLoading}
        >
          {!isPro ? (
            <>
              <Ionicons name="lock-closed" size={14} color={COLORS.gray400} />
              <Text style={[styles.recordButtonText, { color: COLORS.gray400 }]}>PRO</Text>
            </>
          ) : isRecording ? (
            <>
              <View style={styles.recordingDot} />
              <Text style={styles.stopButtonText}>Stop</Text>
            </>
          ) : (
            <>
              <Ionicons name="mic" size={14} color={COLORS.primary} />
              <Text style={styles.recordButtonText}>Record</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingPulse} />
          <Text style={styles.recordingText}>Recording...</Text>
          <Text style={styles.recordingTime}>{formatSeconds(recordingElapsed)}</Text>
        </View>
      )}

      {/* Voice note list or empty state */}
      {!isRecording && voiceNotes.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyState}
          onPress={handleRecordPress}
        >
          <Ionicons name="mic-outline" size={24} color={COLORS.gray300} />
          <Text style={styles.emptyText}>
            {isPro ? 'Tap to record a voice note' : 'Upgrade to Pro for voice notes'}
          </Text>
        </TouchableOpacity>
      ) : (
        !isRecording && voiceNotes.map((note) => {
          const isCurrentNote = currentNoteId === note.id;
          const noteIsPlaying = isCurrentNote && isPlaying;
          const progress = isCurrentNote && durationSeconds > 0
            ? positionSeconds / durationSeconds
            : 0;

          return (
            <TouchableOpacity
              key={note.id}
              style={styles.noteItem}
              onPress={() => noteIsPlaying ? onPause() : onPlay(note)}
              onLongPress={() => handleLongPress(note)}
              activeOpacity={0.7}
            >
              <View style={styles.playButton}>
                <Ionicons
                  name={noteIsPlaying ? 'pause' : 'play'}
                  size={18}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.noteContent}>
                <View style={styles.noteInfo}>
                  <Text style={styles.noteDuration}>
                    {isCurrentNote
                      ? `${formatSeconds(positionSeconds)} / ${formatSeconds(note.duration_seconds)}`
                      : formatSeconds(note.duration_seconds)
                    }
                  </Text>
                  <Text style={styles.noteTimestamp}>
                    {new Date(note.recorded_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

/**
 * Compact voice note count badge for session cards.
 */
export function VoiceNoteCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Ionicons name="mic" size={11} color={COLORS.gray500} />
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary + '10',
  },
  recordButtonActive: {
    backgroundColor: COLORS.error + '15',
  },
  recordButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  stopButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.error,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },

  // Recording indicator
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.error + '10',
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  recordingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  recordingTime: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.error,
    fontVariant: ['tabular-nums'],
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
    gap: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },

  // Note items
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteContent: {
    flex: 1,
  },
  noteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteDuration: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  noteTimestamp: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    color: COLORS.gray500,
  },
});
