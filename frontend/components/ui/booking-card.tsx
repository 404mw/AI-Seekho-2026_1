import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing, typography, radius, shadows } from '@/constants/tokens';
import type { Booking, BookingStatus } from '@/lib/types';

interface BookingCardProps {
  booking: Booking;
  variant: 'customer' | 'provider';
  onPress?: () => void;
  providerName?: string;
  customerName?: string;
}

const STATUS_CONFIG: Record<BookingStatus, { color: string; bg: string; label: string }> = {
  Pending:   { color: colors.warning,   bg: colors.warningLight,  label: 'Pending' },
  Confirmed: { color: colors.accent,    bg: colors.accentLight,   label: 'Confirmed' },
  Completed: { color: colors.success,   bg: colors.successLight,  label: 'Completed' },
  Cancelled: { color: colors.cancelled, bg: colors.scrim,         label: 'Cancelled' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
  );
}

export function BookingCard({ booking, variant, onPress, providerName, customerName }: BookingCardProps) {
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.Pending;
  const name = variant === 'customer' ? providerName : customerName;

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ ...typography.headline, color: colors.label, flex: 1, marginRight: spacing.sm }}>
          {name ?? `Booking #${booking.id.slice(0, 8)}`}
        </Text>
        <View
          style={{
            backgroundColor: cfg.bg,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xxs,
          }}
        >
          <Text style={{ ...typography.caption1, color: cfg.color, fontWeight: '600' }}>
            {cfg.label}
          </Text>
        </View>
      </View>

      <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
        {formatDateTime(booking.scheduled_start)}
      </Text>

      {booking.total_price != null && (
        <Text style={{ ...typography.callout, color: colors.label, fontWeight: '600' }}>
          Rs. {booking.total_price.toLocaleString()}
        </Text>
      )}
    </Pressable>
  );
}
