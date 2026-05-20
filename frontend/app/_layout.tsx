import React from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthContext, AuthProvider } from '@/context/auth-context';
import { ModeContext, ModeProvider } from '@/context/mode-context';
import { api } from '@/lib/api';

function AuthGate() {
  const { session, isLoading } = React.use(AuthContext)!;
  const { mode, setHasProviderProfile, setCanBeProvider, pendingProviderOnboarding, setPendingProviderOnboarding } = React.use(ModeContext)!;
  const segments = useSegments();
  const router = useRouter();
  const probedUserId = React.useRef<string | null>(null);

  // Restore provider status from backend once per unique user session.
  // Handles reinstalls and sign-ins on new devices where SecureStore is empty.
  React.useEffect(() => {
    const userId = session?.user.id;
    if (!userId || probedUserId.current === userId) return;
    probedUserId.current = userId;
    api.get('/providers/me')
      .then(() => {
        setHasProviderProfile(true);
        setCanBeProvider(true);
      })
      .catch(() => {}); // 404 = no provider profile, that's fine
  }, [session]);

  React.useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inCustomer = segments[0] === '(customer)';
    const inProvider = segments[0] === '(provider)';

    if (!session && !inAuth) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuth) {
      router.replace(mode === 'provider' ? '/(provider)' : '/(customer)');
    } else if (session && mode === 'provider' && !inProvider) {
      router.replace('/(provider)');
    } else if (session && mode === 'customer' && !inCustomer) {
      router.replace('/(customer)');
    }
  }, [session, isLoading, mode]);

  // After signup with provider role, auto-navigate to the onboarding wizard.
  // Fires once the user is settled in the customer section.
  React.useEffect(() => {
    if (!pendingProviderOnboarding || !session || segments[0] !== '(customer)') return;
    setPendingProviderOnboarding(false);
    router.push('/(customer)/(profile)/become-provider');
  }, [pendingProviderOnboarding, session, segments]);

  if (isLoading) return null;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ModeProvider>
        <AuthGate />
      </ModeProvider>
    </AuthProvider>
  );
}
