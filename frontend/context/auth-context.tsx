import React from 'react';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextValue | null>(null);

// Extract tokens from a deep-link URL produced by Supabase's email flow.
// PKCE flow:  khidmatai://auth/callback?code=xxx
// Implicit:   khidmatai://auth/callback#access_token=xxx&refresh_token=xxx
async function handleAuthUrl(url: string) {
  if (!url.startsWith('khidmatai://')) return;

  // PKCE — code in query params
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  if (typeof code === 'string') {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }

  // Implicit — tokens in hash fragment
  const hash = url.split('#')[1];
  if (hash) {
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Restore existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Session changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setIsLoading(false);
    });

    // Deep link when app is already open (background → foreground)
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleAuthUrl(url);
    });

    // Deep link when app launches cold from the email verification link
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
