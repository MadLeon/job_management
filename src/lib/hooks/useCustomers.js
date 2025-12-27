/**
 * Hook: useCustomers
 * 
 * 获取并缓存活跃客户列表，按 usage_count 降序、customer_name 升序排序。
 */

import { useQuery } from '@tanstack/react-query';

export function useCustomers(options = {}) {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
}
