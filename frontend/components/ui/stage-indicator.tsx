import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/tokens';

interface StageIndicatorProps {
  label: string;
  status: 'waiting' | 'active' | 'done' | 'failed';
  durationMs?: number;
  isLast?: boolean;
}

export function StageIndicator({ label, status, durationMs, isLast = false }: StageIndicatorProps) {
  const [pulse, setPulse] = React.useState(true);

  React.useEffect(() => {
    if (status !== 'active') return;
    const id = setInterval(() => setPulse((v) => !v), 800);
    return () => clearInterval(id);
  }, [status]);

  const dotColor =
    status === 'done' ? colors.success
    : status === 'active' ? colors.accent
    : status === 'failed' ? colors.error
    : colors.labelTertiary;

  const lineColor =
    status === 'done' ? colors.success
    : status === 'active' ? colors.accent
    : status === 'failed' ? colors.error
    : colors.separator;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ alignItems: 'center', width: 16 }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: dotColor,
            marginTop: 3,
            opacity: status === 'active' ? (pulse ? 1 : 0.3) : 1,
          }}
        />
        {!isLast && (
          <View
            style={{
              width: 1,
              flex: 1,
              backgroundColor: lineColor,
              marginTop: spacing.xs,
              marginBottom: spacing.xs,
              minHeight: spacing.xxl,
            }}
          />
        )}
      </View>

      <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing.md }}>
        <Text style={{ ...typography.headline, color: colors.label }}>{label}</Text>

        {status === 'waiting' && (
          <Text style={{ ...typography.subhead, color: colors.labelTertiary }}>Waiting</Text>
        )}
        {status === 'active' && (
          <Text style={{ ...typography.subhead, color: colors.accent }}>Running...</Text>
        )}
        {status === 'done' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={{ ...typography.subhead, color: colors.successText }}>
              Done{durationMs != null ? ` (${durationMs}ms)` : ''}
            </Text>
          </View>
        )}
        {status === 'failed' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="close-circle" size={14} color={colors.error} />
            <Text style={{ ...typography.subhead, color: colors.errorText }}>Failed</Text>
          </View>
        )}
      </View>
    </View>
  );
}
