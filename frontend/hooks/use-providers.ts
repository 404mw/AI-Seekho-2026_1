import React from 'react';
import { api } from '@/lib/api';
import type { ProviderProfile, ProviderPublic, ProviderOffering, ScheduleEntry } from '@/lib/types';

// GET /providers/{id}
export function useProviderDetail(id: string): {
  provider: ProviderPublic | null;
  isLoading: boolean;
} {
  const [provider, setProvider] = React.useState<ProviderPublic | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.get<ProviderPublic>(`/providers/${id}`)
      .then(setProvider)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  return { provider, isLoading };
}

// GET /providers/me, PUT /providers/me
export function useMyProviderProfile(): {
  profile: ProviderProfile | null;
  isLoading: boolean;
  update: (data: Partial<ProviderProfile>) => Promise<void>;
} {
  const [profile, setProfile] = React.useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<ProviderProfile>('/providers/me');
      setProfile(data);
    } catch {
      // Keep previous data
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const update = async (data: Partial<ProviderProfile>) => {
    const updated = await api.put<ProviderProfile>('/providers/me', data);
    setProfile(updated);
  };

  return { profile, isLoading, update };
}

// GET /providers/me/offerings, POST, PUT, DELETE
export function useOfferings(): {
  offerings: ProviderOffering[];
  isLoading: boolean;
  create: (data: Omit<ProviderOffering, 'id'>) => Promise<void>;
  update: (id: string, data: Partial<ProviderOffering>) => Promise<void>;
  remove: (id: string) => Promise<void>;
} {
  const [offerings, setOfferings] = React.useState<ProviderOffering[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ProviderOffering[]>('/providers/me/offerings');
      setOfferings(data);
    } catch {
      // Keep previous data
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const create = async (data: Omit<ProviderOffering, 'id'>) => {
    await api.post<ProviderOffering>('/providers/me/offerings', data);
    await load();
  };

  const update = async (id: string, data: Partial<ProviderOffering>) => {
    await api.put<ProviderOffering>(`/providers/me/offerings/${id}`, data);
    await load();
  };

  const remove = async (id: string) => {
    await api.delete<void>(`/providers/me/offerings/${id}`);
    setOfferings((prev) => prev.filter((o) => o.id !== id));
  };

  return { offerings, isLoading, create, update, remove };
}

// GET /providers/me/schedule, PUT /providers/me/schedule
export function useSchedule(): {
  schedule: ScheduleEntry[];
  isLoading: boolean;
  update: (entries: ScheduleEntry[]) => Promise<void>;
} {
  const [schedule, setSchedule] = React.useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    api.get<ScheduleEntry[]>('/providers/me/schedule')
      .then(setSchedule)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const update = async (entries: ScheduleEntry[]) => {
    const updated = await api.put<ScheduleEntry[]>('/providers/me/schedule', entries);
    setSchedule(updated);
  };

  return { schedule, isLoading, update };
}
