import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/config';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) { setError(error.message); return; }

    // Best-effort sync — ensures a user profile exists after email-confirmed sign-ups
    if (data.session) {
      const token = data.session.access_token;
      const name = (data.session.user.user_metadata?.full_name as string | undefined) ?? '';
      fetch(`${API_BASE_URL}/users/me/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: name }),
      }).catch(() => {});
    }
    // AuthGate in root layout redirects automatically
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: insets.top + spacing['3xl'],
          paddingBottom: insets.bottom + spacing.xl,
          justifyContent: 'center',
        }}
      >
        {/* App name */}
        <View style={{ alignItems: 'center', marginBottom: spacing['4xl'] }}>
          <Text style={{ ...typography.largeTitle, color: colors.label }}>Summon</Text>
          <Text style={{ ...typography.body, color: colors.labelSecondary, marginTop: spacing.xs }}>
            Book trusted local services
          </Text>
        </View>

        {/* Email */}
        <Text style={{ ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.xs }}>
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.labelTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          style={{
            backgroundColor: colors.backgroundSecondary,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.md,
            ...typography.body,
            color: colors.label,
            marginBottom: spacing.lg,
          }}
        />

        {/* Password */}
        <Text style={{ ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.xs }}>
          Password
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.labelTertiary}
          secureTextEntry
          textContentType="password"
          style={{
            backgroundColor: colors.backgroundSecondary,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.md,
            ...typography.body,
            color: colors.label,
            marginBottom: spacing.xl,
          }}
        />

        {/* Error */}
        {error && (
          <Text selectable style={{ ...typography.footnote, color: colors.error, marginBottom: spacing.md }}>
            {error}
          </Text>
        )}

        {/* Sign In button */}
        <TouchableOpacity
          onPress={handleSignIn}
          disabled={isLoading}
          style={{
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.md,
            alignItems: 'center',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={{ ...typography.headline, color: colors.accentText }}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Sign up link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={{ ...typography.body, color: colors.labelSecondary }}>
            Don't have an account?{'  '}
          </Text>
          <Link href="/(auth)/sign-up" style={{ ...typography.body, color: colors.accent }}>
            Sign up
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}
