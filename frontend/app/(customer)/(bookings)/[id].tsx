import React from 'react';
import { ScrollView, View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useBookingDetail } from '@/hooks/use-bookings';
import { useProviderDetail } from '@/hooks/use-providers';
import { ProviderCard } from '@/components/ui/provider-card';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import type { BookingStatus } from '@/lib/types';

const STATUS_COLOR: Record<BookingStatus, string> = {
  Pending:   colors.warning,
  Confirmed: colors.accent,
  Completed: colors.success,
  Cancelled: colors.cancelled,
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, isLoading, cancel } = useBookingDetail(id);
  const { provider } = useProviderDetail(booking?.provider_id ?? '');
  const [cancelling, setCancelling] = React.useState(false);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancel();
            } catch {
              Alert.alert('Error', 'Could not cancel booking. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Booking' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </>
    );
  }

  if (!booking) {
    return (
      <>
        <Stack.Screen options={{ title: 'Booking' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <Text style={{ ...typography.body, color: colors.labelTertiary }}>Booking not found</Text>
        </View>
      </>
    );
  }

  const statusColor = STATUS_COLOR[booking.status] ?? colors.labelSecondary;

  return (
    <>
      <Stack.Screen options={{ title: 'Booking' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], gap: spacing.xxl }}
      >
        {/* Provider card */}
        {provider && <ProviderCard provider={provider} />}

        {/* Booking details */}
        <View
          style={{
            backgroundColor: colors.backgroundSecondary,
            borderRadius: radius.card,
            borderCurve: 'continuous',
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
              <Text style={{ ...typography.subhead, color: statusColor, fontWeight: '600' }}>
                {booking.status}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.separator }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>Scheduled</Text>
            <Text style={{ ...typography.subhead, color: colors.label }}>
              {formatDateTime(booking.scheduled_start)}
            </Text>
          </View>

          {booking.total_price != null && (
            <>
              <View style={{ height: 1, backgroundColor: colors.separator }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>Estimated Cost</Text>
                <Text style={{ ...typography.subhead, color: colors.label, fontWeight: '600' }}>
                  Rs. {booking.total_price.toLocaleString()}
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 1, backgroundColor: colors.separator }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>Confirmation</Text>
            <Text selectable style={{ ...typography.footnote, color: colors.labelSecondary, fontVariant: ['tabular-nums'] }}>
              #{booking.id.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Cancel button — only shown for cancellable statuses */}
        {(booking.status === 'Pending' || booking.status === 'Confirmed') && (
          <Pressable
            onPress={handleCancel}
            disabled={cancelling}
            style={({ pressed }) => ({
              padding: spacing.lg,
              alignItems: 'center',
              opacity: pressed || cancelling ? 0.6 : 1,
            })}
          >
            {cancelling
              ? <ActivityIndicator size="small" color={colors.error} />
              : <Text style={{ ...typography.headline, color: colors.error }}>Cancel Booking</Text>
            }
          </Pressable>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}
