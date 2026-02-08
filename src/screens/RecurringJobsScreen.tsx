import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, addDays, subDays } from 'date-fns';
import {
  RootStackParamList,
  RecurringJob,
  RecurringJobOccurrence,
  CreateRecurringJobInput,
  RecurringFrequency,
  DayOfWeek,
  Client,
} from '../types';
import { useRecurringJobs, useOccurrences, useRecurringJobMutations } from '../hooks/useRecurringJobs';
import { useClients } from '../hooks/useClients';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { formatDurationHuman } from '../utils/formatters';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'RecurringJobs'>;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQUENCY_OPTIONS: { label: string; value: RecurringFrequency }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

export function RecurringJobsScreen({ navigation }: Props) {
  const { isPremium, checkFeatureAccess } = useSubscription();
  const { primaryColor } = useTheme();
  const { jobs, isLoading, refresh } = useRecurringJobs();
  const { clients } = useClients();
  const { createJob, updateJob, deleteJob, skipOccurrence } = useRecurringJobMutations();

  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<RecurringJob | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  // Form state
  const [formClientId, setFormClientId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('weekly');
  const [formDayOfWeek, setFormDayOfWeek] = useState<DayOfWeek>(1);
  const [formDayOfMonth, setFormDayOfMonth] = useState(1);
  const [formHours, setFormHours] = useState('1');
  const [formMinutes, setFormMinutes] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoInvoice, setFormAutoInvoice] = useState(false);
  const [formStartDate, setFormStartDate] = useState(new Date());
  const [formEndDate, setFormEndDate] = useState<Date | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);

  // Pro gate on mount
  useEffect(() => {
    if (!isPremium) {
      navigation.navigate('Paywall', { feature: 'recurring_jobs' });
    }
  }, [isPremium, navigation]);

  const resetForm = useCallback(() => {
    setFormClientId(null);
    setFormTitle('');
    setFormFrequency('weekly');
    setFormDayOfWeek(1);
    setFormDayOfMonth(1);
    setFormHours('1');
    setFormMinutes('0');
    setFormNotes('');
    setFormAutoInvoice(false);
    setFormStartDate(new Date());
    setFormEndDate(null);
    setEditingJob(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEditForm = useCallback((job: RecurringJob) => {
    setEditingJob(job);
    setFormClientId(job.client_id);
    setFormTitle(job.title);
    setFormFrequency(job.frequency);
    setFormDayOfWeek(job.day_of_week);
    setFormDayOfMonth(job.day_of_month ?? 1);
    const totalMinutes = Math.floor(job.duration_seconds / 60);
    setFormHours(String(Math.floor(totalMinutes / 60)));
    setFormMinutes(String(totalMinutes % 60));
    setFormNotes(job.notes || '');
    setFormAutoInvoice(job.auto_invoice);
    setFormStartDate(parseISO(job.start_date));
    setFormEndDate(job.end_date ? parseISO(job.end_date) : null);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formClientId) {
      Alert.alert('Required', 'Please select a client.');
      return;
    }
    if (!formTitle.trim()) {
      Alert.alert('Required', 'Please enter a job title.');
      return;
    }

    const hours = parseInt(formHours, 10) || 0;
    const minutes = parseInt(formMinutes, 10) || 0;
    const durationSeconds = hours * 3600 + minutes * 60;

    if (durationSeconds <= 0) {
      Alert.alert('Required', 'Duration must be greater than zero.');
      return;
    }

    try {
      if (editingJob) {
        await updateJob(editingJob.id, {
          client_id: formClientId,
          title: formTitle.trim(),
          frequency: formFrequency,
          day_of_week: formDayOfWeek,
          day_of_month: formFrequency === 'monthly' ? formDayOfMonth : null,
          duration_seconds: durationSeconds,
          notes: formNotes.trim() || null,
          auto_invoice: formAutoInvoice,
          start_date: format(formStartDate, 'yyyy-MM-dd'),
          end_date: formEndDate ? format(formEndDate, 'yyyy-MM-dd') : null,
        });
      } else {
        const input: CreateRecurringJobInput = {
          client_id: formClientId,
          title: formTitle.trim(),
          frequency: formFrequency,
          day_of_week: formDayOfWeek,
          day_of_month: formFrequency === 'monthly' ? formDayOfMonth : null,
          duration_seconds: durationSeconds,
          notes: formNotes.trim() || undefined,
          auto_invoice: formAutoInvoice,
          start_date: format(formStartDate, 'yyyy-MM-dd'),
          end_date: formEndDate ? format(formEndDate, 'yyyy-MM-dd') : null,
        };
        await createJob(input);
      }
      setShowForm(false);
      resetForm();
      await refresh();
    } catch {
      Alert.alert('Error', 'Failed to save recurring job.');
    }
  }, [
    formClientId, formTitle, formFrequency, formDayOfWeek, formDayOfMonth,
    formHours, formMinutes, formNotes, formAutoInvoice, formStartDate,
    formEndDate, editingJob, createJob, updateJob, resetForm, refresh,
  ]);

  const handleDelete = useCallback(async (job: RecurringJob) => {
    Alert.alert(
      'Delete Recurring Job',
      `Are you sure you want to delete "${job.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJob(job.id);
              await refresh();
            } catch {
              Alert.alert('Error', 'Failed to delete recurring job.');
            }
          },
        },
      ]
    );
  }, [deleteJob, refresh]);

  const handleToggleActive = useCallback(async (job: RecurringJob) => {
    try {
      await updateJob(job.id, { is_active: !job.is_active });
      await refresh();
    } catch {
      Alert.alert('Error', 'Failed to update job status.');
    }
  }, [updateJob, refresh]);

  const getClientName = useCallback((clientId: number): string => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : 'Unknown Client';
  }, [clients]);

  const frequencyLabel = (f: RecurringFrequency) => {
    switch (f) {
      case 'weekly': return 'Weekly';
      case 'biweekly': return 'Biweekly';
      case 'monthly': return 'Monthly';
    }
  };

  const renderJobCard = useCallback(({ item: job }: { item: RecurringJob }) => {
    const isExpanded = expandedJobId === job.id;

    return (
      <View style={styles.jobCard}>
        <TouchableOpacity
          style={styles.jobCardHeader}
          onPress={() => setExpandedJobId(isExpanded ? null : job.id)}
          activeOpacity={0.7}
        >
          <View style={styles.jobCardLeft}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobClient}>{getClientName(job.client_id)}</Text>
            <View style={styles.jobMeta}>
              <View style={[styles.frequencyBadge, { backgroundColor: primaryColor + '20' }]}>
                <Text style={[styles.frequencyText, { color: primaryColor }]}>
                  {frequencyLabel(job.frequency)}
                </Text>
              </View>
              <Text style={styles.jobDuration}>{formatDurationHuman(job.duration_seconds)}</Text>
              {job.auto_invoice && (
                <View style={styles.autoInvoiceBadge}>
                  <Ionicons name="receipt-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.autoInvoiceText}>Auto-invoice</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.jobCardRight}>
            <TouchableOpacity
              onPress={() => handleToggleActive(job)}
              style={[styles.statusBadge, job.is_active ? styles.activeBadge : styles.pausedBadge]}
            >
              <Text style={[styles.statusText, job.is_active ? styles.activeText : styles.pausedText]}>
                {job.is_active ? 'Active' : 'Paused'}
              </Text>
            </TouchableOpacity>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.gray400}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedSection}>
            <View style={styles.jobActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditForm(job)}
              >
                <Ionicons name="pencil-outline" size={18} color={primaryColor} />
                <Text style={[styles.actionText, { color: primaryColor }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(job)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
            <OccurrencesList jobId={job.id} skipOccurrence={skipOccurrence} onRefresh={refresh} />
          </View>
        )}
      </View>
    );
  }, [expandedJobId, getClientName, primaryColor, handleToggleActive, openEditForm, handleDelete, skipOccurrence, refresh]);

  if (!isPremium) {
    return null;
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading recurring jobs..." />;
  }

  const selectedClient = clients.find(c => c.id === formClientId);

  return (
    <View style={styles.container}>
      {jobs.length === 0 ? (
        <EmptyState
          icon="repeat-outline"
          title="No recurring jobs yet"
          message="Set up repeating jobs to automatically track time for regular work."
          actionLabel="Add Recurring Job"
          onAction={openCreateForm}
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      {jobs.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: primaryColor }]}
          onPress={openCreateForm}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingJob ? 'Edit Recurring Job' : 'New Recurring Job'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSave, { color: primaryColor }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            {/* Client Picker */}
            <Text style={styles.formLabel}>Client *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowClientPicker(true)}
            >
              <Text style={selectedClient ? styles.pickerValueText : styles.pickerPlaceholder}>
                {selectedClient
                  ? `${selectedClient.first_name} ${selectedClient.last_name}`
                  : 'Select a client'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray400} />
            </TouchableOpacity>

            <Input
              label="Job Title"
              placeholder="e.g., Weekly lawn mow"
              value={formTitle}
              onChangeText={setFormTitle}
              required
            />

            {/* Frequency */}
            <Text style={styles.formLabel}>Frequency</Text>
            <View style={styles.segmentedControl}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentButton,
                    formFrequency === opt.value && { backgroundColor: primaryColor },
                  ]}
                  onPress={() => setFormFrequency(opt.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      formFrequency === opt.value && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day picker */}
            {formFrequency !== 'monthly' ? (
              <>
                <Text style={styles.formLabel}>Day of Week</Text>
                <View style={styles.dayPicker}>
                  {DAY_NAMES.map((name, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        formDayOfWeek === index && { backgroundColor: primaryColor },
                      ]}
                      onPress={() => setFormDayOfWeek(index as DayOfWeek)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          formDayOfWeek === index && styles.dayTextActive,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.formLabel}>Day of Month (1-28)</Text>
                <View style={styles.dayOfMonthRow}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setFormDayOfMonth(Math.max(1, formDayOfMonth - 1))}
                  >
                    <Ionicons name="remove" size={20} color={primaryColor} />
                  </TouchableOpacity>
                  <Text style={styles.dayOfMonthValue}>{formDayOfMonth}</Text>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setFormDayOfMonth(Math.min(28, formDayOfMonth + 1))}
                  >
                    <Ionicons name="add" size={20} color={primaryColor} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Duration */}
            <Text style={styles.formLabel}>Duration</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationInput}>
                <Input
                  label="Hours"
                  value={formHours}
                  onChangeText={setFormHours}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <Text style={styles.durationSeparator}>:</Text>
              <View style={styles.durationInput}>
                <Input
                  label="Minutes"
                  value={formMinutes}
                  onChangeText={setFormMinutes}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            </View>

            <Input
              label="Notes"
              placeholder="Optional notes for each session"
              value={formNotes}
              onChangeText={setFormNotes}
              multiline
              numberOfLines={3}
              containerStyle={{ marginTop: SPACING.sm }}
            />

            {/* Auto-invoice toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Auto-invoice</Text>
                <Text style={styles.toggleDescription}>
                  Automatically create an invoice for each session
                </Text>
              </View>
              <Switch
                value={formAutoInvoice}
                onValueChange={setFormAutoInvoice}
                trackColor={{ false: COLORS.gray300, true: primaryColor + '80' }}
                thumbColor={formAutoInvoice ? primaryColor : COLORS.gray100}
              />
            </View>

            {/* Start date */}
            <Text style={styles.formLabel}>Start Date</Text>
            <View style={styles.dateStepperRow}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setFormStartDate(subDays(formStartDate, 1))}
              >
                <Ionicons name="chevron-back" size={20} color={primaryColor} />
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.gray400} />
                <Text style={styles.dateDisplayText}>{format(formStartDate, 'MMM d, yyyy')}</Text>
              </View>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setFormStartDate(addDays(formStartDate, 1))}
              >
                <Ionicons name="chevron-forward" size={20} color={primaryColor} />
              </TouchableOpacity>
            </View>

            {/* End date */}
            <Text style={styles.formLabel}>End Date (optional)</Text>
            {formEndDate ? (
              <View style={styles.dateStepperRow}>
                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={() => setFormEndDate(subDays(formEndDate, 1))}
                >
                  <Ionicons name="chevron-back" size={20} color={primaryColor} />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.gray400} />
                  <Text style={styles.dateDisplayText}>{format(formEndDate, 'MMM d, yyyy')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={() => setFormEndDate(addDays(formEndDate, 1))}
                >
                  <Ionicons name="chevron-forward" size={20} color={primaryColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormEndDate(null)}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setFormEndDate(addDays(formStartDate, 30))}
              >
                <Text style={styles.pickerPlaceholder}>Tap to set end date</Text>
                <Ionicons name="calendar-outline" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            )}

            <View style={{ height: SPACING.xxl }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Client Picker Modal */}
      <Modal visible={showClientPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowClientPicker(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Client</Text>
            <View style={{ width: 50 }} />
          </View>
          <FlatList
            data={clients}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.clientPickerRow,
                  formClientId === item.id && { backgroundColor: primaryColor + '10' },
                ]}
                onPress={() => {
                  setFormClientId(item.id);
                  setShowClientPicker(false);
                }}
              >
                <Text style={styles.clientPickerName}>
                  {item.first_name} {item.last_name}
                </Text>
                {formClientId === item.id && (
                  <Ionicons name="checkmark" size={22} color={primaryColor} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Occurrences sub-component ───────────────────────────────

function OccurrencesList({
  jobId,
  skipOccurrence,
  onRefresh,
}: {
  jobId: number;
  skipOccurrence: (id: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const { occurrences, isLoading, refresh } = useOccurrences(jobId);

  const handleSkip = async (occId: number) => {
    try {
      await skipOccurrence(occId);
      await refresh();
      await onRefresh();
    } catch {
      Alert.alert('Error', 'Failed to skip occurrence.');
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="small" />;
  }

  if (occurrences.length === 0) {
    return (
      <View style={styles.noOccurrences}>
        <Text style={styles.noOccurrencesText}>No occurrences yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.occurrencesList}>
      <Text style={styles.occurrencesTitle}>Occurrences</Text>
      {occurrences.slice(0, 10).map((occ) => (
        <View key={occ.id} style={styles.occurrenceRow}>
          <View style={styles.occurrenceLeft}>
            <Text style={styles.occurrenceDate}>
              {format(parseISO(occ.scheduled_date), 'MMM d, yyyy')}
            </Text>
            <View
              style={[
                styles.occurrenceStatusBadge,
                occ.status === 'completed' && styles.completedBadge,
                occ.status === 'skipped' && styles.skippedBadge,
                occ.status === 'pending' && styles.pendingBadge,
              ]}
            >
              <Text
                style={[
                  styles.occurrenceStatusText,
                  occ.status === 'completed' && styles.completedText,
                  occ.status === 'skipped' && styles.skippedText,
                  occ.status === 'pending' && styles.pendingText,
                ]}
              >
                {occ.status.charAt(0).toUpperCase() + occ.status.slice(1)}
              </Text>
            </View>
          </View>
          {occ.status === 'pending' && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => handleSkip(occ.id)}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {occurrences.length > 10 && (
        <Text style={styles.moreOccurrences}>
          +{occurrences.length - 10} more occurrences
        </Text>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  jobCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.md,
  },
  jobCardLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  jobTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  jobClient: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  frequencyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  frequencyText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  jobDuration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  autoInvoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  autoInvoiceText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
  },
  jobCardRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  pausedBadge: {
    backgroundColor: COLORS.gray100,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  activeText: {
    color: '#16A34A',
  },
  pausedText: {
    color: COLORS.gray500,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    padding: SPACING.md,
  },
  jobActions: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },

  // Modal / Form
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalCancel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalSave: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: SPACING.md,
  },
  formLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  pickerValueText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  pickerPlaceholder: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray400,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md - 2,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  dayPicker: {
    flexDirection: 'row',
    gap: 4,
  },
  dayButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  dayText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dayTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  dayOfMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOfMonthValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  durationInput: {
    flex: 1,
  },
  durationSeparator: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingBottom: SPACING.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  toggleDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: 250,
  },
  dateStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  dateDisplayText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: 2,
  },

  // Client picker modal
  clientPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  clientPickerName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },

  // Occurrences
  occurrencesList: {
    gap: SPACING.xs,
  },
  occurrencesTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  occurrenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  occurrenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  occurrenceDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  occurrenceStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
  },
  skippedBadge: {
    backgroundColor: COLORS.gray100,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  occurrenceStatusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  completedText: {
    color: '#16A34A',
  },
  skippedText: {
    color: COLORS.gray500,
  },
  pendingText: {
    color: '#D97706',
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray100,
  },
  skipButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.gray600,
  },
  noOccurrences: {
    paddingVertical: SPACING.sm,
  },
  noOccurrencesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  moreOccurrences: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingTop: SPACING.xs,
  },
});
