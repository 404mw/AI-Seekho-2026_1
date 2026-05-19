import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';

interface RequestFormProps {
  onSubmit: (prompt: string) => void;
  isSubmitting: boolean;
}

const SUGGESTIONS = [
  'AC repair at home tomorrow AM',
  'Plumber needed urgently today',
  'Electrician this weekend',
];

export function RequestForm({ onSubmit, isSubmitting }: RequestFormProps) {
  const [prompt, setPrompt] = React.useState('');

  const canSubmit = prompt.trim().length > 0 && !isSubmitting;

  return (
    <View style={{ gap: spacing.xl }}>
      <Text style={{ ...typography.headline, color: colors.label }}>
        What service do you need?
      </Text>

      <View
        style={{
          backgroundColor: colors.backgroundSecondary,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          padding: spacing.md,
        }}
      >
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Describe in your own words..."
          placeholderTextColor={colors.labelTertiary}
          multiline
          numberOfLines={4}
          maxLength={500}
          style={{
            ...typography.body,
            color: colors.label,
            minHeight: 88,
            textAlignVertical: 'top',
          }}
        />
        {prompt.length > 0 && (
          <Text
            style={{
              ...typography.caption2,
              color: colors.labelTertiary,
              textAlign: 'right',
              marginTop: spacing.sm,
            }}
          >
            {prompt.length} / 500
          </Text>
        )}
      </View>

      <View>
        <Text style={{ ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.sm }}>
          Examples:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setPrompt(s)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.accentLight : colors.backgroundSecondary,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.separator,
                })}
              >
                <Text style={{ ...typography.subhead, color: colors.accent }}>"{s}"</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <Pressable
        onPress={() => canSubmit && onSubmit(prompt.trim())}
        disabled={!canSubmit}
        style={({ pressed }) => ({
          backgroundColor: canSubmit ? colors.accent : colors.labelQuaternary,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          paddingVertical: spacing.lg,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        {isSubmitting && <ActivityIndicator size="small" color={colors.accentText} />}
        <Text style={{ ...typography.headline, color: colors.accentText }}>
          Find Service Provider
        </Text>
      </Pressable>
    </View>
  );
}
