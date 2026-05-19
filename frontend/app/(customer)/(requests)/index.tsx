import React from 'react';
import { FlatList, View, Text, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useRequestList } from '@/hooks/use-requests';
import { RequestCard } from '@/components/ui/request-card';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/tokens';

export default function RequestsScreen() {
  const router = useRouter();
  const { requests, isLoading, refresh } = useRequestList();

  return (
    <>
      <Stack.Screen options={{ title: 'Requests' }} />
      <FlatList
        data={requests}
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => router.push(`/(customer)/(requests)/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: spacing['3xl'] }}>
              <Text style={{ ...typography.body, color: colors.labelTertiary }}>
                No requests yet
              </Text>
              <Text style={{ ...typography.subhead, color: colors.labelTertiary, marginTop: spacing.sm }}>
                Go to Home to submit your first request
              </Text>
            </View>
          ) : null
        }
      />
    </>
  );
}
