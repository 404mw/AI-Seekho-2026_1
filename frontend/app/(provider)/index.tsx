import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '@/context/auth-context';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';

export default function ProviderDashboard() {
  const { user } = React.use(AuthContext)!;

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Provider';

  const avatarLetter = displayName[0]?.toUpperCase() ?? 'P';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl }}
    >
      {/* Avatar + identity */}
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.brandSecondaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typography.title1, color: colors.brandSecondary }}>{avatarLetter}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ ...typography.title3, color: colors.label }}>{displayName}</Text>
          <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>{user?.email}</Text>
          <View
            style={{
              backgroundColor: colors.brandSecondaryLight,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              marginTop: spacing.xs,
            }}
          >
            <Text style={{ ...typography.caption1, color: colors.brandSecondary, fontWeight: '600' }}>
              Provider Mode
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: colors.separator }} />

      {/* Info card */}
      <View
        style={{
          backgroundColor: colors.backgroundSecondary,
          borderRadius: radius.card,
          borderCurve: 'continuous',
          padding: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="construct-outline" size={20} color={colors.accent} />
          <Text style={{ ...typography.headline, color: colors.label }}>Provider Features</Text>
        </View>
        <Text style={{ ...typography.subhead, color: colors.labelSecondary, lineHeight: 20 }}>
          Accept bookings, manage your services, and view customer reviews — coming soon.
        </Text>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}
