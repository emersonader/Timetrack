import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ProjectTemplate,
  TemplateMaterial,
} from '../types';
import { useProjectTemplates, useTemplateMaterials } from '../hooks/useProjectTemplates';
import { useTheme } from '../context/ThemeContext';
import { formatDurationHuman } from '../utils/formatters';
import { LoadingSpinner } from './LoadingSpinner';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';


interface TemplatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: ProjectTemplate, materials: TemplateMaterial[], addMaterials: boolean) => void;
}

export function TemplatePicker({ visible, onClose, onSelect }: TemplatePickerProps) {
  const { primaryColor } = useTheme();
  const { templates, isLoading } = useProjectTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const handleSelect = useCallback((template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedTemplateId(null);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Use Template</Text>
          <View style={{ width: 50 }} />
        </View>

        {isLoading ? (
          <LoadingSpinner fullScreen message="Loading templates..." />
        ) : selectedTemplateId ? (
          <TemplatePreview
            templateId={selectedTemplateId}
            templates={templates}
            primaryColor={primaryColor}
            onConfirm={(template, materials, addMaterials) => {
              setSelectedTemplateId(null);
              onSelect(template, materials, addMaterials);
            }}
            onBack={() => setSelectedTemplateId(null)}
          />
        ) : (
          <FlatList
            data={templates}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.templateRow}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.templateRowLeft}>
                  <Text style={styles.templateRowTitle}>{item.title}</Text>
                  <View style={[styles.durationBadge, { backgroundColor: primaryColor + '15' }]}>
                    <Text style={[styles.durationBadgeText, { color: primaryColor }]}>
                      {formatDurationHuman(item.estimated_duration_seconds)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Template Preview sub-component ──────────────────────────

function TemplatePreview({
  templateId,
  templates,
  primaryColor,
  onConfirm,
  onBack,
}: {
  templateId: number;
  templates: ProjectTemplate[];
  primaryColor: string;
  onConfirm: (template: ProjectTemplate, materials: TemplateMaterial[], addMaterials: boolean) => void;
  onBack: () => void;
}) {
  const template = templates.find(t => t.id === templateId);
  const { materials, isLoading } = useTemplateMaterials(templateId);

  if (!template) return null;

  const handleUse = () => {
    if (materials.length > 0) {
      Alert.alert(
        'Add Materials?',
        `This template includes ${materials.length} material${materials.length > 1 ? 's' : ''}. Add them to this client?`,
        [
          {
            text: 'Skip Materials',
            style: 'cancel',
            onPress: () => onConfirm(template, materials, false),
          },
          {
            text: 'Add Materials',
            onPress: () => onConfirm(template, materials, true),
          },
        ]
      );
    } else {
      onConfirm(template, [], false);
    }
  };

  return (
    <View style={styles.previewContainer}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color={primaryColor} />
        <Text style={[styles.backText, { color: primaryColor }]}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.previewTitle}>{template.title}</Text>
      <View style={[styles.previewDuration, { backgroundColor: primaryColor + '15' }]}>
        <Ionicons name="time-outline" size={16} color={primaryColor} />
        <Text style={[styles.previewDurationText, { color: primaryColor }]}>
          {formatDurationHuman(template.estimated_duration_seconds)}
        </Text>
      </View>

      {template.default_notes && (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Notes</Text>
          <Text style={styles.previewNotes}>{template.default_notes}</Text>
        </View>
      )}

      {isLoading ? (
        <LoadingSpinner size="small" />
      ) : materials.length > 0 ? (
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Materials ({materials.length})</Text>
          {materials.map((mat) => (
            <View key={mat.id} style={styles.previewMaterialRow}>
              <Text style={styles.previewMaterialName}>{mat.name}</Text>
              <Text style={styles.previewMaterialCost}>${mat.cost.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.useButton, { backgroundColor: primaryColor }]}
        onPress={handleUse}
        activeOpacity={0.8}
      >
        <Text style={styles.useButtonText}>Use Template</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  cancelText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionHeader: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sectionHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    ...SHADOWS.sm,
  },
  templateRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  templateRowTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  durationBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  durationBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },

  // Preview
  previewContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  backText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  previewTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  previewDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  previewDurationText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: SPACING.lg,
  },
  previewLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  previewNotes: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  previewMaterialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  previewMaterialName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  previewMaterialCost: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  useButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  useButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});
