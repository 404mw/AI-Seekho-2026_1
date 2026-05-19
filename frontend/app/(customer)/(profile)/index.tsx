import React from 'react';
import { ScrollView, View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { AuthContext } from '@/context/auth-context';
import { ModeContext } from '@/context/mode-context';
import { api } from '@/lib/api';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';

export default function ProfileScreen() {
  const { user, signOut } = React.use(AuthContext)!;
  const { setMode, hasProviderProfile, setHasProviderProfile } = React.use(ModeContext)!;
  const [isSyncing, setIsSyncing] = React.useState(false);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'User';

  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  const handleBecomeProvider = async () => {
    setIsSyncing(true);
    try {
      await api.post('/providers/me/sync');
      setHasProviderProfile(true);
      setMode('provider');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create provider profile');
    } finally {
      setIsSyncing(false);
    }
  };

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

        {/* Provider mode actions */}
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
              onPress={handleBecomeProvider}
              disabled={isSyncing}
              style={({ pressed }) => ({
                backgroundColor: colors.backgroundSecondary,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.lg,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: spacing.sm,
                opacity: pressed || isSyncing ? 0.7 : 1,
              })}
            >
              {isSyncing && <ActivityIndicator size="small" color={colors.accent} />}
              <Text style={{ ...typography.headline, color: colors.accent }}>
                {isSyncing ? 'Setting up...' : 'Become a Provider'}
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
