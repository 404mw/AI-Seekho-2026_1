import React from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthContext, AuthProvider } from '@/context/auth-context';
import { ModeContext, ModeProvider } from '@/context/mode-context';

function AuthGate() {
  const { session, isLoading } = React.use(AuthContext)!;
  const { mode } = React.use(ModeContext)!;
  const segments = useSegments();
  const router = useRouter();

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
