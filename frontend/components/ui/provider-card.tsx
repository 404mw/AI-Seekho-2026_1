import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing, typography, radius, shadows } from '@/constants/tokens';
import type { ProviderPublic } from '@/lib/types';

interface ProviderCardProps {
  provider: ProviderPublic;
  distanceKm?: number;
}

export function ProviderCard({ provider, distanceKm }: ProviderCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.backgroundSecondary,
        borderRadius: radius.card,
        borderCurve: 'continuous',
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        boxShadow: shadows.sm,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.accentLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="person-circle-outline" size={28} color={colors.accent} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.headline, color: colors.label }}>
          {provider.business_name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs }}>
          {provider.average_rating != null && (
            <>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
                {provider.average_rating.toFixed(1)}
              </Text>
            </>
          )}
          {distanceKm != null && (
            <>
              <Text style={{ ...typography.subhead, color: colors.labelTertiary }}> · </Text>
              <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
                {distanceKm.toFixed(1)} km
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
