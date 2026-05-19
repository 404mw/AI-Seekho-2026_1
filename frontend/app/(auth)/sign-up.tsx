import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { ModeContext } from '@/context/mode-context';
import { colors } from '@/constants/colors';
import { spacing, typography, radius } from '@/constants/tokens';
import { API_BASE_URL } from '@/constants/config';

type Role = 'customer' | 'provider' | 'both';

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'customer', label: 'Book services', description: 'Find and hire trusted service providers' },
  { value: 'provider', label: 'Offer services', description: 'Accept jobs and grow your business' },
  { value: 'both', label: 'Both', description: 'Switch between customer and provider modes' },
];

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const { setMode, setHasProviderProfile } = React.use(ModeContext)!;
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<Role>('customer');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verificationSent, setVerificationSent] = React.useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      if (!data.session) {
        // Email confirmation is required — session is not active yet.
        // Persist the chosen mode so AuthGate routes correctly after sign-in.
        setMode(role === 'provider' ? 'provider' : 'customer');
        if (role === 'provider' || role === 'both') setHasProviderProfile(true);
        setVerificationSent(true);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session.access_token}`,
      };
      const body = JSON.stringify({ full_name: name });

      if (role === 'customer' || role === 'both') {
        await fetch(`${API_BASE_URL}/users/me/sync`, { method: 'POST', headers, body });
      }
      if (role === 'provider' || role === 'both') {
        await fetch(`${API_BASE_URL}/providers/me/sync`, { method: 'POST', headers, body });
        setHasProviderProfile(true);
      }

      setMode(role === 'provider' ? 'provider' : 'customer');
      // Root AuthGate handles redirect after mode + session are set
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <Ionicons name="mail-outline" size={64} color={colors.accent} />
        <Text style={{ ...typography.title2, color: colors.label, marginTop: spacing.lg, textAlign: 'center' }}>
          Check your email
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.labelSecondary,
            marginTop: spacing.md,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          We sent a verification link to{'\n'}
          <Text style={{ color: colors.label, fontWeight: '600' }}>{email}</Text>
          {'\n\n'}Tap the link to activate your account, then come back and sign in.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.md,
        }}
      >
        {/* Name */}
        <View>
          <Text style={{ ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.xs }}>
            Full Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ali Hassan"
            placeholderTextColor={colors.labelTertiary}
            textContentType="name"
            style={fieldStyle}
          />
        </View>

        {/* Email */}
        <View>
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
            style={fieldStyle}
          />
        </View>

        {/* Password */}
        <View>
          <Text style={{ ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.xs }}>
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.labelTertiary}
            secureTextEntry
            textContentType="newPassword"
            style={fieldStyle}
          />
        </View>

        {/* Role selection */}
        <View style={{ marginTop: spacing.sm }}>
          <Text style={{ ...typography.subhead, color: colors.labelSecondary, marginBottom: spacing.md }}>
            I want to:
          </Text>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              onPress={() => setRole(r.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                borderRadius: radius.card,
                borderCurve: 'continuous',
                backgroundColor: role === r.value ? colors.accentLight : colors.backgroundSecondary,
                borderWidth: 1.5,
                borderColor: role === r.value ? colors.accent : 'transparent',
                marginBottom: spacing.sm,
              }}
            >
              <Ionicons
                name={role === r.value ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={role === r.value ? colors.accent : colors.labelTertiary}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.callout, color: colors.label }}>{r.label}</Text>
                <Text style={{ ...typography.footnote, color: colors.labelSecondary, marginTop: 2 }}>
                  {r.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error */}
        {error && (
          <Text selectable style={{ ...typography.footnote, color: colors.error }}>
            {error}
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={isLoading}
          style={{
            backgroundColor: colors.accent,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.md,
            alignItems: 'center',
            opacity: isLoading ? 0.7 : 1,
            marginTop: spacing.sm,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={{ ...typography.headline, color: colors.accentText }}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const fieldStyle = {
  backgroundColor: colors.backgroundSecondary,
  borderRadius: radius.md,
  borderCurve: 'continuous' as const,
  padding: spacing.md,
  ...typography.body,
  color: colors.label,
} as const;
