import React from 'react';
import { View, Text } from 'react-native';
import { StageIndicator } from './stage-indicator';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import type { AgentStage, AgentTrace } from '@/lib/types';

interface ProgressTrackerProps {
  currentStage: AgentStage;
  isFailed: boolean;
  traces: AgentTrace[];
}

const STAGES: Array<{ key: string; label: string }> = [
  { key: 'intent',    label: 'Intent' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'decision',  label: 'Decision' },
  { key: 'booking',   label: 'Booking' },
];

const ORDER = ['intent', 'discovery', 'decision', 'booking'];

function getStageStatus(
  stageKey: string,
  currentStage: AgentStage,
  isFailed: boolean,
  traces: AgentTrace[],
): 'waiting' | 'active' | 'done' | 'failed' {
  const stageIdx = ORDER.indexOf(stageKey);

  if (currentStage === 'completed') return 'done';

  if (isFailed) {
    const failedTrace = traces.find((t) => t.status === 'Failed');
    if (failedTrace) {
      const failedIdx = ORDER.findIndex((s) =>
        failedTrace.agent_name.toLowerCase().includes(s),
      );
      if (failedIdx !== -1) {
        if (stageIdx < failedIdx) return 'done';
        if (stageIdx === failedIdx) return 'failed';
        return 'waiting';
      }
    }
    return 'waiting';
  }

  const currentIdx = ORDER.indexOf(currentStage);
  if (currentIdx === -1) return 'waiting';
  if (stageIdx < currentIdx) return 'done';
  if (stageIdx === currentIdx) return 'active';
  return 'waiting';
}

export function ProgressTracker({ currentStage, isFailed, traces }: ProgressTrackerProps) {
  return (
    <View
      style={{
        backgroundColor: colors.backgroundSecondary,
        borderRadius: radius.card,
        borderCurve: 'continuous',
        padding: spacing.lg,
      }}
    >
      <Text style={{ ...typography.headline, color: colors.label, marginBottom: spacing.md }}>
        AI Pipeline
      </Text>
      {STAGES.map((stage, idx) => {
        const status = getStageStatus(stage.key, currentStage, isFailed, traces);
        const trace = traces.find((t) => t.agent_name.toLowerCase().includes(stage.key));
        return (
          <StageIndicator
            key={stage.key}
            label={stage.label}
            status={status}
            durationMs={trace?.execution_time_ms}
            isLast={idx === STAGES.length - 1}
          />
        );
      })}
    </View>
  );
}
