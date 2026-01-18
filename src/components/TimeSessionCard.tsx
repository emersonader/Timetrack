import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionWithBillable } from '../types';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../utils/constants';
import {
  formatTimeRange,
  formatDurationHuman,
  formatCurrency,
  formatDate,
} from '../utils/formatters';

interface TimeSessionCardProps {
  session: SessionWithBillable;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export function TimeSessionCard({
  session,
  onPress,
  onEdit,
  onDelete,
  showDate = false,
}: TimeSessionCardProps) {
  const isActive = session.is_active;

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.containerActive]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={isActive ? 'timer' : 'time-outline'}
          size={20}
          color={isActive ? COLORS.success : COLORS.gray500}
        />
      </View>

      <View style={styles.content}>
        {showDate && (
          <Text style={styles.date}>{formatDate(session.date)}</Text>
        )}
        <Text style={styles.timeRange}>
          {formatTimeRange(session.start_time, session.end_time)}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="hourglass-outline" size={12} color={COLORS.gray500} />
            <Text style={styles.statText}>
              {isActive ? 'In Progress' : formatDurationHuman(session.duration)}
            </Text>
          </View>
          {!isActive && (
            <View style={styles.stat}>
              <Ionicons name="cash-outline" size={12} color={COLORS.success} />
              <Text style={[styles.statText, styles.billable]}>
                {formatCurrency(session.billable_amount)}
              </Text>
            </View>
          )}
        </View>
        {session.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text-outline" size={12} color={COLORS.gray400} />
            <Text style={styles.notesText} numberOfLines={2}>
              {session.notes}
            </Text>
          </View>
        )}
      </View>

      {onEdit && !isActive && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {onDelete && !isActive && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}

      {isActive && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>LIVE</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface SessionGroupHeaderProps {
  date: string;
  totalDuration: number;
  totalBillable: number;
}

export function SessionGroupHeader({
  date,
  totalDuration,
  totalBillable,
}: SessionGroupHeaderProps) {
  return (
    <View style={styles.groupHeader}>
      <Text style={styles.groupDate}>{formatDate(date)}</Text>
      <View style={styles.groupStats}>
        <Text style={styles.groupStatText}>
          {formatDurationHuman(totalDuration)}
        </Text>
        <Text style={styles.groupStatDivider}>•</Text>
        <Text style={[styles.groupStatText, styles.groupBillable]}>
          {formatCurrency(totalBillable)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  containerActive: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  date: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginBottom: 2,
  },
  timeRange: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  billable: {
    color: COLORS.success,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  notesText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    fontStyle: 'italic',
  },
  editButton: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  activeBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.sm,
  },
  groupDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  groupStatText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  groupStatDivider: {
    color: COLORS.gray300,
  },
  groupBillable: {
    color: COLORS.success,
    fontWeight: '500',
  },
});
