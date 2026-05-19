import React from 'react';
import { api } from '@/lib/api';
import { usePoll } from '@/hooks/use-poll';
import type { ServiceRequest, AgentStage, AgentTrace, RequestStatus } from '@/lib/types';

// POST /requests → returns { service_request_id, status }
export function useSubmitRequest(): {
  submit: (prompt: string) => Promise<{ id: string }>;
  isSubmitting: boolean;
  error: Error | null;
} {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const submit = async (prompt: string): Promise<{ id: string }> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.post<{ service_request_id: string; status: string }>('/requests', { prompt });
      return { id: result.service_request_id };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error };
}

// GET /requests
export function useRequestList(): {
  requests: ServiceRequest[];
  isLoading: boolean;
  refresh: () => void;
} {
  const [requests, setRequests] = React.useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ServiceRequest[]>('/requests');
      setRequests(data);
    } catch {
      // Keep previous data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return { requests, isLoading, refresh: load };
}

const TERMINAL = (v: RequestStatus) =>
  v.status === 'completed' || v.status === 'failed';

// GET /requests/{id} + polling GET /requests/{id}/status + GET /requests/{id}/trace
export function useRequestDetail(id: string): {
  request: ServiceRequest | null;
  stage: AgentStage;
  isComplete: boolean;
  isFailed: boolean;
  traces: AgentTrace[];
  isLoading: boolean;
} {
  const [request, setRequest] = React.useState<ServiceRequest | null>(null);
  const [traces, setTraces] = React.useState<AgentTrace[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pollingEnabled, setPollingEnabled] = React.useState(false);

  const stage: AgentStage = request?.current_agent_stage ?? 'pending';
  const isComplete = stage === 'completed';
  const isFailed = stage === 'failed';

  // Initial fetch — determine whether to start polling
  React.useEffect(() => {
    setIsLoading(true);
    api.get<ServiceRequest>(`/requests/${id}`)
      .then((req) => {
        setRequest(req);
        const terminal = req.current_agent_stage === 'completed' || req.current_agent_stage === 'failed';
        if (terminal) {
          api.get<AgentTrace[]>(`/requests/${id}/trace`).then(setTraces).catch(() => {});
          setIsLoading(false);
        } else {
          setPollingEnabled(true);
          setIsLoading(false);
        }
      })
      .catch(() => setIsLoading(false));
  }, [id]);

  const { data: pollData } = usePoll<RequestStatus>({
    fetcher: () => api.get<RequestStatus>(`/requests/${id}/status`),
    stopWhen: TERMINAL,
    enabled: pollingEnabled,
  });

  // Handle poll updates
  React.useEffect(() => {
    if (!pollData) return;
    // Update stage optimistically from poll data
    setRequest((prev) =>
      prev ? { ...prev, current_agent_stage: pollData.current_agent_stage } : prev
    );
    if (TERMINAL(pollData)) {
      setPollingEnabled(false);
      // Fetch final state + traces
      Promise.all([
        api.get<ServiceRequest>(`/requests/${id}`),
        api.get<AgentTrace[]>(`/requests/${id}/trace`),
      ])
        .then(([req, traceList]) => {
          setRequest(req);
          setTraces(traceList);
        })
        .catch(() => {});
    }
  }, [id, pollData]);

  return { request, stage, isComplete, isFailed, traces, isLoading };
}
