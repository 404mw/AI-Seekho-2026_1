import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AuthContext } from '@/context/auth-context';
import { ModeContext } from '@/context/mode-context';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = React.use(AuthContext)!;
  const { setMode, hasProviderProfile } = React.use(ModeContext)!;

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'User';

  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xxl }}
      >
        {/* Avatar + identity */}
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accentLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...typography.title1, color: colors.accent }}>{avatarLetter}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ ...typography.title3, color: colors.label }}>{displayName}</Text>
            <Text style={{ ...typography.subhead, color: colors.labelSecondary }}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.separator }} />

        {/* Provider mode section */}
        <View style={{ gap: spacing.md }}>
          {hasProviderProfile ? (
            <Pressable
              onPress={() => setMode('provider')}
              style={({ pressed }) => ({
                backgroundColor: colors.accentLight,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.lg,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ ...typography.headline, color: colors.accent }}>
                Switch to Provider Mode
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/(customer)/(profile)/become-provider')}
              style={({ pressed }) => ({
                backgroundColor: colors.backgroundSecondary,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.lg,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ ...typography.headline, color: colors.accent }}>
                Offer Services on Khidmat AI
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: colors.separator }} />

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({
            padding: spacing.lg,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ ...typography.headline, color: colors.error }}>Sign Out</Text>
        </Pressable>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}
