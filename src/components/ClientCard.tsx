import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '../types';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import {
  formatFullName,
  formatPhoneNumber,
  truncate,
  formatCurrency,
  getInitials,
} from '../utils/formatters';

interface ClientCardProps {
  client: Client;
  onPress: () => void;
  showRate?: boolean;
  compact?: boolean;
}

export const ClientCard = React.memo(function ClientCard({
  client,
  onPress,
  showRate = false,
  compact = false,
}: ClientCardProps) {
  const fullName = formatFullName(client.first_name, client.last_name);
  const initials = getInitials(client.first_name, client.last_name);

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{fullName}</Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color={COLORS.gray500} />
            <Text style={styles.detailText}>
              {formatPhoneNumber(client.phone)}
            </Text>
          </View>

          {client.city && !compact && (
            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={COLORS.gray500}
              />
              <Text style={styles.detailText}>
                {truncate(`${client.city}, ${client.state}`, 30)}
              </Text>
            </View>
          )}
        </View>

        {showRate && (
          <Text style={styles.rate}>
            {formatCurrency(client.hourly_rate, client.currency)}/hr
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
    </TouchableOpacity>
  );
});

interface ClientCardCompactProps {
  client: Client;
  onPress: () => void;
  selected?: boolean;
}

export const ClientCardCompact = React.memo(function ClientCardCompact({
  client,
  onPress,
  selected = false,
}: ClientCardCompactProps) {
  const fullName = formatFullName(client.first_name, client.last_name);
  const initials = getInitials(client.first_name, client.last_name);

  return (
    <TouchableOpacity
      style={[styles.containerCompact, selected && styles.containerSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarSmall, selected && styles.avatarSelected]}>
        <Text style={[styles.avatarTextSmall, selected && styles.avatarTextSelected]}>
          {initials}
        </Text>
      </View>

      <View style={styles.contentCompact}>
        <Text style={[styles.nameCompact, selected && styles.nameSelected]}>
          {fullName}
        </Text>
        <Text style={styles.phoneCompact}>
          {formatPhoneNumber(client.phone)}
        </Text>
      </View>

      {selected && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  containerSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.gray50,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarSelected: {
    backgroundColor: COLORS.primary,
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  avatarTextSmall: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  avatarTextSelected: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentCompact: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  nameCompact: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  nameSelected: {
    color: COLORS.primary,
  },
  details: {
    gap: SPACING.xs / 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  phoneCompact: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  rate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
});
