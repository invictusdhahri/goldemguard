import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { AnalysisJob, FinalResponse } from '@veritas/shared';

export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job-status', jobId],
    queryFn: () => apiFetch<AnalysisJob>(`/status/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'done' || status === 'failed' ? false : 2000;
    },
  });
}

export function useResult(jobId: string | null) {
  return useQuery({
    queryKey: ['result', jobId],
    queryFn: () => apiFetch<FinalResponse>(`/result/${jobId}`),
    enabled: !!jobId,
  });
}
