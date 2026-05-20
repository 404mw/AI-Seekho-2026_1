import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

export default function ProviderBookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.label },
        headerBackTitleVisible: false,
      }}
    />
  );
}
