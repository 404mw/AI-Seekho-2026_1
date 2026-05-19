import React from 'react';
import * as SecureStore from 'expo-secure-store';

type Mode = 'customer' | 'provider';

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  hasProviderProfile: boolean;
  setHasProviderProfile: (v: boolean) => void;
}

export const ModeContext = React.createContext<ModeContextValue | null>(null);

const MODE_KEY = 'app_mode';
const HAS_PROVIDER_KEY = 'has_provider_profile';

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<Mode>('customer');
  const [hasProviderProfile, setHasProviderProfileState] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(MODE_KEY),
      SecureStore.getItemAsync(HAS_PROVIDER_KEY),
    ]).then(([savedMode, savedHasProvider]) => {
      if (savedMode === 'provider') setModeState('provider');
      if (savedHasProvider === 'true') setHasProviderProfileState(true);
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

  return (
    <ModeContext.Provider value={{ mode, setMode, hasProviderProfile, setHasProviderProfile }}>
      {children}
    </ModeContext.Provider>
  );
}
