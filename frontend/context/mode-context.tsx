import React from 'react';
import * as SecureStore from 'expo-secure-store';

type Mode = 'customer' | 'provider';

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  hasProviderProfile: boolean;
  setHasProviderProfile: (v: boolean) => void;
  canBeProvider: boolean;
  setCanBeProvider: (v: boolean) => void;
  pendingProviderOnboarding: boolean;
  setPendingProviderOnboarding: (v: boolean) => void;
}

export const ModeContext = React.createContext<ModeContextValue | null>(null);

const MODE_KEY = 'app_mode';
const HAS_PROVIDER_KEY = 'has_provider_profile';
const CAN_BE_PROVIDER_KEY = 'can_be_provider';
const PENDING_ONBOARDING_KEY = 'pending_provider_onboarding';

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<Mode>('customer');
  const [hasProviderProfile, setHasProviderProfileState] = React.useState(false);
  const [canBeProvider, setCanBeProviderState] = React.useState(false);
  const [pendingProviderOnboarding, setPendingProviderOnboardingState] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(MODE_KEY),
      SecureStore.getItemAsync(HAS_PROVIDER_KEY),
      SecureStore.getItemAsync(CAN_BE_PROVIDER_KEY),
      SecureStore.getItemAsync(PENDING_ONBOARDING_KEY),
    ]).then(([savedMode, savedHasProvider, savedCanBeProvider, savedPendingOnboarding]) => {
      if (savedMode === 'provider') setModeState('provider');
      if (savedHasProvider === 'true') setHasProviderProfileState(true);
      if (savedPendingOnboarding === 'true') setPendingProviderOnboardingState(true);

      if (savedCanBeProvider !== null) {
        setCanBeProviderState(savedCanBeProvider === 'true');
      } else if (savedHasProvider === 'true') {
        // Legacy accounts: if they already have a provider profile they can switch
        setCanBeProviderState(true);
      }
    });
  }, []);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    SecureStore.setItemAsync(MODE_KEY, newMode);
  };

  const setHasProviderProfile = (v: boolean) => {
    setHasProviderProfileState(v);
    SecureStore.setItemAsync(HAS_PROVIDER_KEY, String(v));
  };

  const setCanBeProvider = (v: boolean) => {
    setCanBeProviderState(v);
    SecureStore.setItemAsync(CAN_BE_PROVIDER_KEY, String(v));
  };

  const setPendingProviderOnboarding = (v: boolean) => {
    setPendingProviderOnboardingState(v);
    SecureStore.setItemAsync(PENDING_ONBOARDING_KEY, String(v));
  };

  return (
    <ModeContext.Provider
      value={{ mode, setMode, hasProviderProfile, setHasProviderProfile, canBeProvider, setCanBeProvider, pendingProviderOnboarding, setPendingProviderOnboarding }}
    >
      {children}
    </ModeContext.Provider>
  );
}
