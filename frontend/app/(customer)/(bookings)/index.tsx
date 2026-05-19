import React from 'react';
import { FlatList, View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUserBookings } from '@/hooks/use-bookings';
import { BookingCard } from '@/components/ui/booking-card';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import type { BookingStatus } from '@/lib/types';

const FILTERS: Array<{ label: string; value: BookingStatus | undefined }> = [
  { label: 'All',       value: undefined },
  { label: 'Pending',   value: 'Pending' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Done',      value: 'Completed' },
];

export default function BookingsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = React.useState<BookingStatus | undefined>(undefined);
  const { bookings, isLoading, refresh } = useUserBookings(activeFilter);

  return (
    <>
      <Stack.Screen options={{ title: 'Bookings' }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Filter chips */}
        <View style={{ paddingBottom: spacing.sm }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
          >
            {FILTERS.map((f) => {
              const active = activeFilter === f.value;
              return (
                <Pressable
                  key={f.label}
                  onPress={() => setActiveFilter(f.value)}
                  style={({ pressed }) => ({
                    backgroundColor: active ? colors.accent : colors.backgroundSecondary,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      ...typography.subhead,
                      color: active ? colors.accentText : colors.label,
                      fontWeight: active ? '600' : '400',
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={bookings}
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              variant="customer"
              onPress={() => router.push(`/(customer)/(bookings)/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={{ alignItems: 'center', paddingTop: spacing['3xl'] }}>
                <Text style={{ ...typography.body, color: colors.labelTertiary }}>
                  No bookings yet
                </Text>
                <Text style={{ ...typography.subhead, color: colors.labelTertiary, marginTop: spacing.sm }}>
                  Bookings appear here once a request completes
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}
