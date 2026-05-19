import React from 'react';
import { api } from '@/lib/api';
import type { Booking, BookingStatus } from '@/lib/types';

// GET /bookings?status=
export function useUserBookings(status?: BookingStatus): {
  bookings: Booking[];
  isLoading: boolean;
  refresh: () => void;
} {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const path = status ? `/bookings?status=${status}` : '/bookings';
      const data = await api.get<Booking[]>(path);
      setBookings(data);
    } catch {
      // Keep previous data
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  React.useEffect(() => { load(); }, [load]);

  return { bookings, isLoading, refresh: load };
}

// GET /bookings/{id}, PUT /bookings/{id}/cancel
export function useBookingDetail(id: string): {
  booking: Booking | null;
  isLoading: boolean;
  cancel: () => Promise<void>;
} {
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<Booking>(`/bookings/${id}`);
      setBooking(data);
    } catch {
      // Keep previous data
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    await api.put<Booking>(`/bookings/${id}/cancel`);
    await load();
  };

  return { booking, isLoading, cancel };
}

// GET /providers/me/bookings?status=
export function useProviderBookings(status?: BookingStatus): {
  bookings: Booking[];
  isLoading: boolean;
  refresh: () => void;
} {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const path = status ? `/providers/me/bookings?status=${status}` : '/providers/me/bookings';
      const data = await api.get<Booking[]>(path);
      setBookings(data);
    } catch {
      // Keep previous data
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  React.useEffect(() => { load(); }, [load]);

  return { bookings, isLoading, refresh: load };
}

// GET /bookings/{id}, PUT /providers/me/bookings/{id}/status
export function useProviderBookingDetail(id: string): {
  booking: Booking | null;
  isLoading: boolean;
  updateStatus: (status: 'Confirmed' | 'Completed') => Promise<void>;
} {
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<Booking>(`/bookings/${id}`);
      setBooking(data);
    } catch {
      // Keep previous data
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const updateStatus = async (status: 'Confirmed' | 'Completed') => {
    await api.put<Booking>(`/providers/me/bookings/${id}/status`, { status });
    await load();
  };

  return { booking, isLoading, updateStatus };
}
