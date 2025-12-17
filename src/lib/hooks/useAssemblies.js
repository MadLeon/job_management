import { useQuery } from '@tanstack/react-query';

export function useAssemblies(partNumber) {
  return useQuery({
    queryKey: ['assemblies', partNumber],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/assemblies?partNumber=${encodeURIComponent(partNumber)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch assemblies');
      }
      return res.json();
    },
    enabled: !!partNumber,
  });
}
