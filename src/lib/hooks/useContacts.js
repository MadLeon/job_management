/**
 * Hook: useContacts
 * 
 * 获取并缓存活跃联系人列表，按 usage_count 降序、contact_name 升序排序。
 * 支持按 customer_name 过滤。
 */

import { useQuery } from '@tanstack/react-query';

export function useContacts(customerName = null, options = {}) {
  return useQuery({
    queryKey: ['contacts', customerName],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerName) {
        params.append('customer_name', customerName);
      }

      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
}
