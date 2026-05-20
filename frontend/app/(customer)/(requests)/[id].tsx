import React from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRequestDetail } from '@/hooks/use-requests';
import { BookingCard } from '@/components/ui/booking-card';
import { api } from '@/lib/api';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import type { AgentTrace, Booking, ProviderPublic } from '@/lib/types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function friendlyFailureMessage(traces: AgentTrace[]): string {
  const failed = traces.find((t) => t.status === 'Failed');
  if (!failed) return 'Something went wrong. Please try again.';

  const agent = failed.agent_name.toLowerCase();
  const raw = ((failed.structured_output?.error as string | undefined) ?? '').toLowerCase();

  if (agent.includes('intent')) {
    return 'We couldn\'t understand your request. Try rephrasing it with more specific details about the service you need.';
  }
  if (agent.includes('discovery')) {
    if (raw.includes('no provider') || raw.includes('not found') || raw.includes('no match') || raw.includes('no candidate')) {
      return 'No providers are available for this service in your area right now. Try again later or adjust your request.';
    }
    return 'We ran into an issue while searching for providers. Please try again.';
  }
  if (agent.includes('decision')) {
    return 'We found providers but couldn\'t select the best match. Please try again.';
  }
  if (agent.includes('booking')) {
    return 'We couldn\'t confirm your booking — the provider may have become unavailable. Please try again.';
  }
  return 'Something went wrong with your request. Please try again.';
}

const STAGE_LABELS: Record<string, string> = {
  pending:   'Queued',
  intent:    'Understanding your request',
  discovery: 'Searching for providers',
  decision:  'Selecting the best match',
  booking:   'Confirming your booking',
  completed: 'Done',
  failed:    'Failed',
};

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request, stage, isComplete, isFailed, traces, isLoading } = useRequestDetail(id);

  const [completedBooking, setCompletedBooking] = React.useState<Booking | null>(null);
  const [providerName, setProviderName] = React.useState<string | undefined>();

  const hapticFiredRef = React.useRef<'none' | 'success' | 'error'>('none');

  React.useEffect(() => {
    if (isComplete && hapticFiredRef.current === 'none') {
      hapticFiredRef.current = 'success';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isComplete]);

  React.useEffect(() => {
    if (isFailed && hapticFiredRef.current === 'none') {
      hapticFiredRef.current = 'error';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isFailed]);

  React.useEffect(() => {
    if (!isComplete) return;
    let cancelled = false;

    api.get<Booking[]>('/bookings').then((list) => {
      if (cancelled) return;
      const booking = list.find((b) => b.service_request_id === id);
      if (booking) {
        setCompletedBooking(booking);
        api.get<ProviderPublic>(`/providers/${booking.provider_id}`)
          .then((p) => { if (!cancelled) setProviderName(p.business_name); })
          .catch(() => {});
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [isComplete, id]);

  const isProcessing = !isLoading && !isComplete && !isFailed;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Request' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Request Detail' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl }}
      >
        {/* Prompt */}
        <View style={{ gap: spacing.xs }}>
          <Text selectable style={{ ...typography.title3, color: colors.label }}>
            {request?.prompt}
          </Text>
          {request?.created_at && (
            <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
              Submitted {formatDateTime(request.created_at)}
            </Text>
          )}
        </View>

        {/* Processing state */}
        {isProcessing && (
          <View
            style={{
              backgroundColor: colors.accentLight,
              borderRadius: radius.card,
              borderCurve: 'continuous',
              padding: spacing.xl,
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <ActivityIndicator size="large" color={colors.accent} />
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <Text style={{ ...typography.headline, color: colors.accent }}>
                AI is working on your request
              </Text>
              <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
                {STAGE_LABELS[stage] ?? 'Processing…'}
              </Text>
            </View>
          </View>
        )}

        {/* Completed booking card */}
        {isComplete && completedBooking && (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={{ ...typography.headline, color: colors.label }}>Booking Confirmed</Text>
            </View>
            <BookingCard
              booking={completedBooking}
              variant="customer"
              providerName={providerName}
              onPress={() => router.push(`/(customer)/(bookings)/${completedBooking.id}`)}
            />
          </View>
        )}

        {/* Failed message */}
        {isFailed && (
          <View
            style={{
              backgroundColor: colors.errorLight,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="close-circle" size={20} color={colors.errorText} />
              <Text style={{ ...typography.headline, color: colors.errorText }}>
                Request could not be completed
              </Text>
            </View>
            <Text style={{ ...typography.subhead, color: colors.errorText }}>
              {friendlyFailureMessage(traces)}
            </Text>
          </View>
        )}

        {/* View Agent Flow button — always visible once we have a stage */}
        {stage !== 'pending' && (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(customer)/(requests)/agent-logs', params: { id } })
            }
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.backgroundSecondary,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              padding: spacing.lg,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="stats-chart-outline" size={20} color={colors.accent} />
              <Text style={{ ...typography.subhead, color: colors.accent, fontWeight: '600' }}>
                View Agent Flow & Logs
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.labelTertiary} />
          </Pressable>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}
