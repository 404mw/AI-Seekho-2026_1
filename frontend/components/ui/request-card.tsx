import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing, typography, radius, shadows } from '@/constants/tokens';
import type { ServiceRequest } from '@/lib/types';

interface RequestCardProps {
  request: ServiceRequest;
  onPress?: () => void;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  const isProcessing = request.status === 'processing';
  const isFailed = request.status === 'failed';

  const statusColor =
    isProcessing ? colors.processing
    : isFailed ? colors.error
    : request.status === 'completed' ? colors.success
    : colors.pending;

  const statusLabel = isProcessing
    ? request.current_agent_stage
    : request.status.charAt(0).toUpperCase() + request.status.slice(1);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.backgroundElevated,
        borderRadius: radius.card,
        borderCurve: 'continuous',
        padding: spacing.lg,
        boxShadow: shadows.card,
        opacity: pressed ? 0.85 : 1,
        gap: spacing.sm,
      })}
    >
      <Text numberOfLines={2} style={{ ...typography.body, color: colors.label }}>
        {request.prompt}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {isProcessing ? (
          <ActivityIndicator size="small" color={statusColor} />
        ) : (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
        )}
        <Text style={{ ...typography.subhead, color: statusColor, textTransform: 'capitalize' }}>
          {statusLabel}
        </Text>
        <Text style={{ ...typography.subhead, color: colors.labelTertiary }}>·</Text>
        <Text style={{ ...typography.subhead, color: colors.labelTertiary }}>
          {formatRelativeTime(request.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}
