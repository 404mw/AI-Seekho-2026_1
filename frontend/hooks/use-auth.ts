import React from 'react';
import { AuthContext } from '@/context/auth-context';

export function useAuth() {
  const ctx = React.use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
