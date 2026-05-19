import React from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRequestDetail } from '@/hooks/use-requests';
import { ProgressTracker } from '@/components/ui/progress-tracker';
import { BookingCard } from '@/components/ui/booking-card';
import { api } from '@/lib/api';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import type { Booking, ProviderPublic, AgentTrace } from '@/lib/types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function TraceRow({ trace }: { trace: AgentTrace }) {
  const [expanded, setExpanded] = React.useState(false);
  const statusColor = trace.status === 'Success' ? colors.success : colors.error;

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={{ gap: spacing.xs, paddingVertical: spacing.sm }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...typography.subhead, color: colors.label, fontWeight: '600' }}>
          {trace.agent_name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ ...typography.caption1, color: statusColor }}>{trace.status}</Text>
          <Text style={{ ...typography.caption1, color: colors.labelTertiary }}>
            {trace.execution_time_ms}ms
          </Text>
        </View>
      </View>
      {expanded && (
        <Text style={{ ...typography.footnote, color: colors.labelSecondary }}>
          {trace.reasoning_log}
        </Text>
      )}
    </Pressable>
  );
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request, stage, isComplete, isFailed, traces, isLoading } = useRequestDetail(id);

  const [completedBooking, setCompletedBooking] = React.useState<Booking | null>(null);
  const [providerName, setProviderName] = React.useState<string | undefined>();
  const [traceVisible, setTraceVisible] = React.useState(false);

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

        {/* Pipeline tracker */}
        <ProgressTracker currentStage={stage} isFailed={isFailed} traces={traces} />

        {/* Completed booking card */}
        {isComplete && completedBooking && (
          <View style={{ gap: spacing.md }}>
            <Text style={{ ...typography.headline, color: colors.label }}>Booking Confirmed</Text>
            <BookingCard
              booking={completedBooking}
              variant="customer"
              providerName={providerName}
              onPress={() => router.push(`/(customer)/(bookings)/${completedBooking.id}`)}
            />
          </View>
        )}

        {/* Failed message */}
        {isFailed && (() => {
          const failedTrace = traces.find((t) => t.status === 'Failed');
          const reason = failedTrace
            ? (failedTrace.structured_output?.error as string | undefined)
              ?? failedTrace.reasoning_log?.split('\n').pop()
            : undefined;
          return (
            <View
              style={{
                backgroundColor: colors.errorLight,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.lg,
                gap: spacing.sm,
              }}
            >
              <Text style={{ ...typography.headline, color: colors.errorText }}>
                Pipeline Failed
                {failedTrace ? ` — ${failedTrace.agent_name.replace('_agent', '').replace('_', ' ')}` : ''}
              </Text>
              <Text style={{ ...typography.subhead, color: colors.errorText }}>
                {reason ?? 'The AI could not complete your request. Please try again with more details.'}
              </Text>
            </View>
          );
        })()}

        {/* View Trace accordion */}
        {traces.length > 0 && (
          <View
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={() => setTraceVisible((v) => !v)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing.lg,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ ...typography.subhead, color: colors.accent, fontWeight: '600' }}>
                {traceVisible ? 'Hide Trace' : 'View Trace'}
              </Text>
              <Text style={{ ...typography.subhead, color: colors.labelTertiary }}>
                {traces.length} agents
              </Text>
            </Pressable>

            {traceVisible && (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.separator,
                  paddingHorizontal: spacing.lg,
                  paddingBottom: spacing.md,
                }}
              >
                {traces.map((trace, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <View style={{ height: 1, backgroundColor: colors.separator }} />}
                    <TraceRow trace={trace} />
                  </React.Fragment>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}
