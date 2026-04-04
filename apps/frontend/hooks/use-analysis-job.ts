import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  AnalysisApiError,
  fetchJobResult,
  fetchJobStatus,
  type JobStatusPayload,
} from '@/lib/analysis-api';
import { normalizeFinalResponse } from '@/lib/analysis-normalize';
import type { FinalResponse } from '@veritas/shared';

const POLL_MS = 2000;

export function useAnalysisJob(jobId: string, token: string | null) {
  const queryClient = useQueryClient();
  const enabled = Boolean(jobId && token);

  const statusQuery = useQuery({
    queryKey: ['analysis-job-status', jobId],
    queryFn: () => fetchJobStatus(jobId, token!),
    enabled,
    retry: (failureCount, err) => {
      if (err instanceof AnalysisApiError && (err.status === 401 || err.status === 404)) {
        return false;
      }
      return failureCount < 2;
    },
    refetchInterval: (q) => {
      const d = q.state.data as JobStatusPayload | undefined;
      if (!d) return POLL_MS;
      if (d.status === 'done' || d.status === 'failed') return false;
      return POLL_MS;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const resultQuery = useQuery({
    queryKey: ['analysis-job-result', jobId],
    queryFn: async () => {
      const raw = await fetchJobResult(jobId, token!);
      return normalizeFinalResponse(jobId, raw);
    },
    enabled: enabled && statusQuery.data?.status === 'done',
    retry: (failureCount, err) => {
      if (err instanceof AnalysisApiError && (err.status === 401 || err.status === 404)) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const refetchAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['analysis-job-status', jobId] });
    void queryClient.invalidateQueries({ queryKey: ['analysis-job-result', jobId] });
  }, [queryClient, jobId]);

  const result: FinalResponse | null = resultQuery.data ?? null;

  return {
    statusQuery,
    resultQuery,
    jobMeta: statusQuery.data,
    result,
    refetchAll,
  };
}
