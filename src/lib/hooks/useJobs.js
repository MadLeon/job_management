import { useQuery } from '@tanstack/react-query';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await fetch('/api/order-items');
      return res.json();
    }
  });
}

export function useJobParts(jobId) {
  return useQuery({
    queryKey: ['jobs', jobId, 'parts'],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/parts`);
      return res.json();
    }
  });
}