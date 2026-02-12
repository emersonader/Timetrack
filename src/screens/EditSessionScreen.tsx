import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { getSessionById } from '../db/sessionRepository';
import { useSessionMutations } from '../hooks/useSessions';
import { useClient } from '../hooks/useClients';
import { useSessionTags } from '../hooks/useTags';
import { setSessionTags } from '../db/tagRepository';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { LoadingSpinner, LoadingOverlay } from '../components/LoadingSpinner';
import { TagPicker } from '../components/TagPicker';
import {
  formatDateForDb,
  formatDateTimeForDb,
  formatCurrency,
  formatDate,
  formatDuration,
} from '../utils/formatters';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSession'>;

export function EditSessionScreen({ route, navigation }: Props) {
  const { sessionId, clientId } = route.params;
  const { client } = useClient(clientId);
  const { updateSessionData, deleteSession, isLoading: isMutating } = useSessionMutations();
  const { tags: sessionTags, isLoading: isLoadingTags } = useSessionTags(sessionId);

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Form state
  const [date, setDate] = useState('');
  const [startHour, setStartHour] = useState('');
  const [startMinute, setStartMinute] = useState('');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM');
  const [notes, setNotes] = useState('');

  // Calculated values
  const [duration, setDuration] = useState(0);
  const [billableAmount, setBillableAmount] = useState(0);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSessionById(sessionId);
        if (!session) {
          Alert.alert('Error', 'Session not found');
          navigation.goBack();
          return;
        }

        // Parse date
        setDate(session.date);

        // Parse start time
        const startDate = new Date(session.start_time);
        let startH = startDate.getHours();
        const startM = startDate.getMinutes();
        setStartAmPm(startH >= 12 ? 'PM' : 'AM');
        if (startH > 12) startH -= 12;
        if (startH === 0) startH = 12;
        setStartHour(startH.toString());
        setStartMinute(startM.toString().padStart(2, '0'));

        // Parse end time
        if (session.end_time) {
          const endDate = new Date(session.end_time);
          let endH = endDate.getHours();
          const endM = endDate.getMinutes();
          setEndAmPm(endH >= 12 ? 'PM' : 'AM');
          if (endH > 12) endH -= 12;
          if (endH === 0) endH = 12;
          setEndHour(endH.toString());
          setEndMinute(endM.toString().padStart(2, '0'));
        }

        setNotes(session.notes || '');
        setDuration(session.duration);
      } catch (error) {
        console.error('Error loading session:', error);
        Alert.alert('Error', 'Failed to load session');
        navigation.goBack();
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [sessionId, navigation]);

  // Initialize selected tags from loaded session tags
  useEffect(() => {
    if (sessionTags.length > 0) {
      setSelectedTagIds(sessionTags.map((t) => t.id));
    }
  }, [sessionTags]);

  // Calculate duration when times change
  useEffect(() => {
    if (!startHour || !endHour || !date) return;

    try {
      // Convert to 24-hour format
      let startH = parseInt(startHour, 10);
      let endH = parseInt(endHour, 10);
      const startM = parseInt(startMinute || '0', 10);
      const endM = parseInt(endMinute || '0', 10);

      if (startAmPm === 'PM' && startH !== 12) startH += 12;
      if (startAmPm === 'AM' && startH === 12) startH = 0;
      if (endAmPm === 'PM' && endH !== 12) endH += 12;
      if (endAmPm === 'AM' && endH === 12) endH = 0;

      // Create date objects
      const startDateTime = new Date(`${date}T${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}:00`);
      const endDateTime = new Date(`${date}T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`);

      // Handle overnight sessions (end time is before start time)
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const durationSeconds = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000);

      if (durationSeconds > 0) {
        setDuration(durationSeconds);
        if (client) {
          const hours = durationSeconds / 3600;
          setBillableAmount(hours * client.hourly_rate);
        }
      }
    } catch (error) {
      console.error('Error calculating duration:', error);
    }
  }, [startHour, startMinute, startAmPm, endHour, endMinute, endAmPm, date, client]);

  const handleFieldChange = () => {
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate
    if (!startHour || !endHour) {
      Alert.alert('Error', 'Please enter start and end times');
      return;
    }

    const startH = parseInt(startHour, 10);
    const endH = parseInt(endHour, 10);

    if (isNaN(startH) || startH < 1 || startH > 12) {
      Alert.alert('Error', 'Invalid start hour (1-12)');
      return;
    }
    if (isNaN(endH) || endH < 1 || endH > 12) {
      Alert.alert('Error', 'Invalid end hour (1-12)');
      return;
    }

    if (duration <= 0) {
      Alert.alert('Error', 'Duration must be positive');
      return;
    }

    try {
      // Convert to 24-hour format for storage
      let start24 = parseInt(startHour, 10);
      let end24 = parseInt(endHour, 10);
      const startM = parseInt(startMinute || '0', 10);
      const endM = parseInt(endMinute || '0', 10);

      if (startAmPm === 'PM' && start24 !== 12) start24 += 12;
      if (startAmPm === 'AM' && start24 === 12) start24 = 0;
      if (endAmPm === 'PM' && end24 !== 12) end24 += 12;
      if (endAmPm === 'AM' && end24 === 12) end24 = 0;

      const startDateTime = new Date(`${date}T${start24.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}:00`);
      let endDateTime = new Date(`${date}T${end24.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`);

      // Handle overnight
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      await updateSessionData(sessionId, {
        start_time: formatDateTimeForDb(startDateTime),
        end_time: formatDateTimeForDb(endDateTime),
        duration,
        date,
        notes: notes || undefined,
      });

      // Save tags
      await setSessionTags(sessionId, selectedTagIds);

      navigation.goBack();
    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this time session? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(sessionId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const toggleAmPm = (type: 'start' | 'end') => {
    handleFieldChange();
    if (type === 'start') {
      setStartAmPm((prev) => (prev === 'AM' ? 'PM' : 'AM'));
    } else {
      setEndAmPm((prev) => (prev === 'AM' ? 'PM' : 'AM'));
    }
  };

  if (isLoadingSession) {
    return <LoadingSpinner fullScreen message="Loading session..." />;
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <LoadingOverlay visible={isMutating} message="Saving..." />
        {/* Date */}
        <Input
          label="Date"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={(text) => {
            setDate(text);
            handleFieldChange();
          }}
        />

        {/* Start Time */}
        <Text style={styles.label}>Start Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <Input
              placeholder="12"
              value={startHour}
              onChangeText={(text) => {
                setStartHour(text.replace(/[^0-9]/g, '').slice(0, 2));
                handleFieldChange();
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={styles.timeInput}>
            <Input
              placeholder="00"
              value={startMinute}
              onChangeText={(text) => {
                setStartMinute(text.replace(/[^0-9]/g, '').slice(0, 2));
                handleFieldChange();
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <TouchableOpacity
            style={styles.amPmButton}
            onPress={() => toggleAmPm('start')}
          >
            <Text style={styles.amPmText}>{startAmPm}</Text>
          </TouchableOpacity>
        </View>

        {/* End Time */}
        <Text style={styles.label}>End Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <Input
              placeholder="12"
              value={endHour}
              onChangeText={(text) => {
                setEndHour(text.replace(/[^0-9]/g, '').slice(0, 2));
                handleFieldChange();
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <Text style={styles.timeSeparator}>:</Text>
          <View style={styles.timeInput}>
            <Input
              placeholder="00"
              value={endMinute}
              onChangeText={(text) => {
                setEndMinute(text.replace(/[^0-9]/g, '').slice(0, 2));
                handleFieldChange();
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <TouchableOpacity
            style={styles.amPmButton}
            onPress={() => toggleAmPm('end')}
          >
            <Text style={styles.amPmText}>{endAmPm}</Text>
          </TouchableOpacity>
        </View>

        {/* Duration & Billable Amount Display */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{formatDuration(duration)}</Text>
          </View>
          {client && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Billable Amount</Text>
              <Text style={styles.summaryValueHighlight}>
                {formatCurrency(billableAmount, client?.currency)}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <Input
          label="Notes (Optional)"
          placeholder="Add notes about this session..."
          value={notes}
          onChangeText={(text) => {
            setNotes(text);
            handleFieldChange();
          }}
          multiline
          numberOfLines={3}
        />

        {/* Tags */}
        <TagPicker
          selectedTagIds={selectedTagIds}
          onTagsChange={(tagIds) => {
            setSelectedTagIds(tagIds);
            handleFieldChange();
          }}
        />

        {/* Delete Button */}
        <Button
          title="Delete Session"
          onPress={handleDelete}
          variant="danger"
          style={styles.deleteButton}
        />
      <View style={styles.footer}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="outline"
          style={styles.footerButton}
        />
        <Button
          title="Save Changes"
          onPress={handleSave}
          variant="primary"
          loading={isMutating}
          disabled={!hasChanges || isMutating}
          style={styles.footerButton}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timeInput: {
    width: 70,
  },
  timeSeparator: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.xs,
  },
  amPmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.sm,
  },
  amPmText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    ...SHADOWS.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray600,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryValueHighlight: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.success,
  },
  deleteButton: {
    marginTop: SPACING.xl,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'android' ? 64 : SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  footerButton: {
    flex: 1,
  },
});
