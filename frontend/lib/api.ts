import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/config';
import type { ApiResponse } from '@/lib/types';

class ApiClient {
  private async getHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        signal: controller.signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
    clearTimeout(timer);

    const parsed: ApiResponse<T> = await response.json();

    if (!response.ok) {
      const rawDetail = (parsed as { detail?: unknown }).detail;
      const detail =
        parsed.error?.detail ??
        parsed.message ??
        (typeof rawDetail === 'string' ? rawDetail : null) ??
        'Request failed';
      throw new Error(detail);
    }

    return parsed.data;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
