import React from 'react';
import { ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSubmitRequest } from '@/hooks/use-requests';
import { RequestForm } from '@/components/forms/request-form';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { submit, isSubmitting } = useSubmitRequest();

  const handleSubmit = async (prompt: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { id } = await submit(prompt);
      router.push(`/(customer)/(requests)/${id}`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Seekho' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <RequestForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </ScrollView>
    </>
  );
}
