import React from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRequestDetail } from '@/hooks/use-requests';
import { ProgressTracker } from '@/components/ui/progress-tracker';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import type { AgentTrace } from '@/lib/types';

function TraceRow({ trace }: { trace: AgentTrace }) {
  const [expanded, setExpanded] = React.useState(false);
  const statusColor = trace.status === 'Success' ? colors.success : colors.error;
  const statusIcon: React.ComponentProps<typeof Ionicons>['name'] =
    trace.status === 'Success' ? 'checkmark-circle' : 'close-circle';

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={{ gap: spacing.xs, paddingVertical: spacing.sm }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 }}>
          <Ionicons name={statusIcon} size={16} color={statusColor} />
          <Text style={{ ...typography.subhead, color: colors.label, fontWeight: '600', flex: 1 }}>
            {trace.agent_name.replace(/_agent$/, '').replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ ...typography.caption1, color: colors.labelTertiary }}>
            {trace.execution_time_ms}ms
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.labelTertiary}
          />
        </View>
      </View>
      {expanded && trace.reasoning_log && (
        <View
          style={{
            backgroundColor: colors.backgroundTertiary,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.md,
            marginTop: spacing.xs,
          }}
        >
          <Text
            selectable
            style={{ ...typography.footnote, color: colors.labelSecondary, lineHeight: 18 }}
          >
            {trace.reasoning_log}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function AgentLogsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stage, isComplete, isFailed, traces, isLoading } = useRequestDetail(id);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Agent Flow' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Agent Flow & Logs' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
      >
        {/* Pipeline visualisation */}
        <ProgressTracker currentStage={stage} isFailed={isFailed} traces={traces} />

        {/* Live processing indicator */}
        {!isComplete && !isFailed && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: colors.accentLight,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              padding: spacing.md,
            }}
          >
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ ...typography.subhead, color: colors.accent }}>
              Agent pipeline is running…
            </Text>
          </View>
        )}

        {/* Trace logs */}
        {traces.length > 0 && (
          <View>
            <Text style={{ ...typography.headline, color: colors.label, marginBottom: spacing.md }}>
              Execution Logs
            </Text>
            <View
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              }}
            >
              {traces.map((trace, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <View style={{ height: 1, backgroundColor: colors.separator }} />}
                  <TraceRow trace={trace} />
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {traces.length === 0 && !isLoading && (
          <View style={{ alignItems: 'center', paddingTop: spacing['3xl'] }}>
            <Ionicons name="time-outline" size={40} color={colors.labelTertiary} />
            <Text style={{ ...typography.subhead, color: colors.labelTertiary, marginTop: spacing.md }}>
              No logs yet — the pipeline is starting up
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}
