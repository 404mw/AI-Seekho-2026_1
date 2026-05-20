import React from 'react';
import { ScrollView, View, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { BookingCard } from '@/components/ui/booking-card';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/tokens';
import type { Booking } from '@/lib/types';

export default function ProviderBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.get<Booking[]>('/providers/me/bookings');
      setBookings(data);
    } catch {
      // silently ignore — empty list shown
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setIsRefreshing(true);
    load(true);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'My Bookings' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing['4xl'] }}>
            <ActivityIndicator size="large" color={colors.brandSecondary} />
          </View>
        ) : bookings.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.md }}>
            <Text style={{ ...typography.title3, color: colors.labelSecondary }}>No bookings yet</Text>
            <Text style={{ ...typography.subhead, color: colors.labelTertiary, textAlign: 'center' }}>
              Bookings assigned to you by the AI will appear here.
            </Text>
          </View>
        ) : (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              variant="provider"
              onPress={() => router.push(`/(provider)/bookings/${b.id}`)}
            />
          ))
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}
