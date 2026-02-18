import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  RootStackParamList,
  ProjectTemplate,
  CreateProjectTemplateInput,
} from '../types';
import { useProjectTemplates, useProjectTemplateMutations, useTemplateMaterials } from '../hooks/useProjectTemplates';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import { formatDurationHuman } from '../utils/formatters';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Input } from '../components/Input';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectTemplates'>;


export function ProjectTemplatesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isPremium, checkFeatureAccess } = useSubscription();
  const { primaryColor } = useTheme();
  const { templates, isLoading, refresh } = useProjectTemplates();
  const { createTemplate, deleteTemplate } = useProjectTemplateMutations();

  const [showForm, setShowForm] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<number | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formHours, setFormHours] = useState('1');
  const [formMinutes, setFormMinutes] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [formMaterials, setFormMaterials] = useState<{ name: string; cost: string }[]>([]);

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormHours('1');
    setFormMinutes('0');
    setFormNotes('');
    setFormMaterials([]);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!formTitle.trim()) {
      Alert.alert(t('common.required'), t('projectTemplates.pleaseEnterTemplateTitle'));
      return;
    }

    const hours = parseInt(formHours, 10) || 0;
    const minutes = parseInt(formMinutes, 10) || 0;
    const durationSeconds = hours * 3600 + minutes * 60;

    if (durationSeconds <= 0) {
      Alert.alert(t('common.required'), t('projectTemplates.durationMustBeGreaterThanZero'));
      return;
    }

    try {
      const materials = formMaterials
        .filter(m => m.name.trim())
        .map(m => ({
          name: m.name.trim(),
          cost: parseFloat(m.cost) || 0,
        }));

      const input: CreateProjectTemplateInput = {
        title: formTitle.trim(),
        trade_category: 'general',
        estimated_duration_seconds: durationSeconds,
        default_notes: formNotes.trim() || undefined,
        materials: materials.length > 0 ? materials : undefined,
      };

      await createTemplate(input);
      setShowForm(false);
      resetForm();
      await refresh();
    } catch {
      Alert.alert(t('common.error'), t('projectTemplates.failedToSaveTemplate'));
    }
  }, [formTitle, formHours, formMinutes, formNotes, formMaterials, createTemplate, resetForm, refresh, t]);

  const handleDelete = useCallback(async (template: ProjectTemplate) => {
    if (template.is_builtin) return;
    Alert.alert(
      t('projectTemplates.deleteTemplate'),
      t('projectTemplates.deleteTemplateConfirm', { title: template.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(template.id);
              await refresh();
            } catch {
              Alert.alert(t('common.error'), t('projectTemplates.failedToDeleteTemplate'));
            }
          },
        },
      ]
    );
  }, [deleteTemplate, refresh]);

  const addMaterialRow = useCallback(() => {
    setFormMaterials(prev => [...prev, { name: '', cost: '' }]);
  }, []);

  const updateMaterialRow = useCallback((index: number, field: 'name' | 'cost', value: string) => {
    setFormMaterials(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeMaterialRow = useCallback((index: number) => {
    setFormMaterials(prev => prev.filter((_, i) => i !== index));
  }, []);

  const renderTemplateCard = useCallback(({ item: template }: { item: ProjectTemplate }) => {
    const isExpanded = expandedTemplateId === template.id;

    return (
      <TouchableOpacity
        style={styles.templateCard}
        onPress={() => setExpandedTemplateId(isExpanded ? null : template.id)}
        onLongPress={() => !template.is_builtin && handleDelete(template)}
        activeOpacity={0.7}
      >
        <View style={styles.templateCardHeader}>
          <View style={styles.templateCardLeft}>
            <View style={styles.templateTitleRow}>
              <Text style={styles.templateTitle}>{template.title}</Text>
              {template.is_builtin && (
                <View style={[styles.builtinBadge, { backgroundColor: primaryColor + '20' }]}>
                  <Text style={[styles.builtinBadgeText, { color: primaryColor }]}>{t('projectTemplates.builtin')}</Text>
                </View>
              )}
            </View>
            <View style={styles.templateMeta}>
              <View style={[styles.durationBadge, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons name="time-outline" size={12} color={primaryColor} />
                <Text style={[styles.durationBadgeText, { color: primaryColor }]}>
                  {formatDurationHuman(template.estimated_duration_seconds)}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.gray400}
          />
        </View>

        {isExpanded && (
          <ExpandedTemplateDetails
            template={template}
            primaryColor={primaryColor}
            onDelete={!template.is_builtin ? () => handleDelete(template) : undefined}
          />
        )}
      </TouchableOpacity>
    );
  }, [expandedTemplateId, primaryColor, handleDelete]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('projectTemplates.loadingTemplates')} />;
  }

  // Check if there are any custom templates
  const hasCustomTemplates = templates.some(t => !t.is_builtin);

  return (
    <View style={styles.container}>
      {templates.length === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title={t('projectTemplates.noTemplatesYet')}
          message={t('projectTemplates.createReusableTemplates')}
          actionLabel={t('projectTemplates.createTemplate')}
          onAction={openCreateForm}
        />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTemplateCard}
          extraData={expandedTemplateId}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={openCreateForm}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('projectTemplates.newTemplate')}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSave, { color: primaryColor }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <Input
              label={t('projectTemplates.templateTitle')}
              placeholder={t('projectTemplates.templateTitlePlaceholder')}
              value={formTitle}
              onChangeText={setFormTitle}
              required
            />

            {/* Duration */}
            <Text style={styles.formLabel}>{t('projectTemplates.estimatedDuration')}</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationInput}>
                <Input
                  label={t('common.hours')}
                  value={formHours}
                  onChangeText={setFormHours}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <Text style={styles.durationSeparator}>:</Text>
              <View style={styles.durationInput}>
                <Input
                  label={t('common.minutes')}
                  value={formMinutes}
                  onChangeText={setFormMinutes}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            </View>

            <Input
              label={t('projectTemplates.defaultNotes')}
              placeholder={t('projectTemplates.defaultNotesPlaceholder')}
              value={formNotes}
              onChangeText={setFormNotes}
              multiline
              numberOfLines={3}
              containerStyle={{ marginTop: SPACING.sm }}
            />

            {/* Materials */}
            <View style={styles.materialsSection}>
              <View style={styles.materialsHeader}>
                <Text style={styles.formLabel}>{t('materials.title')}</Text>
                <TouchableOpacity onPress={addMaterialRow} style={styles.addMaterialBtn}>
                  <Ionicons name="add-circle-outline" size={22} color={primaryColor} />
                  <Text style={[styles.addMaterialText, { color: primaryColor }]}>{t('common.add')}</Text>
                </TouchableOpacity>
              </View>

              {formMaterials.map((mat, index) => (
                <View key={index} style={styles.materialRow}>
                  <TextInput
                    style={styles.materialNameInput}
                    placeholder={t('projectTemplates.materialNamePlaceholder')}
                    value={mat.name}
                    onChangeText={(v) => updateMaterialRow(index, 'name', v)}
                    placeholderTextColor={COLORS.gray400}
                  />
                  <TextInput
                    style={styles.materialCostInput}
                    placeholder="0.00"
                    value={mat.cost}
                    onChangeText={(v) => updateMaterialRow(index, 'cost', v)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.gray400}
                  />
                  <TouchableOpacity onPress={() => removeMaterialRow(index)}>
                    <Ionicons name="close-circle" size={22} color={COLORS.gray400} />
                  </TouchableOpacity>
                </View>
              ))}

              {formMaterials.length === 0 && (
                <Text style={styles.noMaterialsText}>{t('projectTemplates.noMaterialsAdded')}</Text>
              )}
            </View>

            <View style={{ height: SPACING.xxl }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Expanded Template Details sub-component ─────────────────

function ExpandedTemplateDetails({
  template,
  primaryColor,
  onDelete,
}: {
  template: ProjectTemplate;
  primaryColor: string;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const { materials, isLoading } = useTemplateMaterials(template.id);

  return (
    <View style={styles.expandedSection}>
      {template.default_notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>{t('common.notes')}:</Text>
          <Text style={styles.notesText}>{template.default_notes}</Text>
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner size="small" />
      ) : materials.length > 0 ? (
        <View style={styles.materialsListSection}>
          <Text style={styles.materialsListTitle}>{t('materials.title')}:</Text>
          {materials.map((mat) => (
            <View key={mat.id} style={styles.materialsListRow}>
              <Text style={styles.materialsListName}>{mat.name}</Text>
              <Text style={styles.materialsListCost}>${mat.cost.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {onDelete && (
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          <Text style={[styles.deleteButtonText, { color: COLORS.error }]}>{t('projectTemplates.deleteTemplate')}</Text>
        </TouchableOpacity>
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
  sectionHeader: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sectionHeaderText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  templateCardLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  templateTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  builtinBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.sm,
  },
  builtinBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  durationBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    padding: SPACING.md,
  },
  notesSection: {
    marginBottom: SPACING.sm,
  },
  notesLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  materialsListSection: {
    marginBottom: SPACING.sm,
  },
  materialsListTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  materialsListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  materialsListName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  materialsListCost: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
  },
  deleteButtonText: {
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
  categoryChips: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
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

  // Materials in form
  materialsSection: {
    marginTop: SPACING.md,
  },
  materialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMaterialText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  materialNameInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  materialCostInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    textAlign: 'right',
  },
  noMaterialsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
});
