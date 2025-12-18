import { useQuery } from '@tanstack/react-query';

/**
 * 使用搜索关键词获取匹配的job记录
 * 集成React Query，支持缓存和自动重试
 * 
 * @param {string} searchQuery - 搜索关键词（job_number, po_number, part_number, drawing_number）
 * @param {number} [limit=20] - 返回结果的最大数量
 * @param {boolean} [enabled=true] - 是否启用此query
 * @returns {Object} React Query查询结果对象
 * @returns {Array} data - 匹配的job记录列表
 * @returns {boolean} isLoading - 是否正在加载
 * @returns {boolean} isError - 是否发生错误
 * @returns {Error} error - 错误对象
 * @returns {boolean} isFetching - 是否正在获取数据
 * 
 * @example
 * const { data: searchResults, isLoading } = useJobSearch('JOB123', 20);
 */
export function useJobSearch(searchQuery, limit = 20, enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'search', searchQuery, limit],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
      }

      const res = await fetch(
        `/api/jobs/search?q=${encodeURIComponent(searchQuery.trim())}&limit=${limit}`
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Searching failed');
      }

      return res.json();
    },
    // 只有当searchQuery非空且enabled为true时才执行查询
    // 确保enabled是boolean类型，避免React Query报错
    enabled: !!(enabled && searchQuery && searchQuery.trim().length > 0),
    // 搜索结果缓存3分钟
    staleTime: 3 * 60 * 1000,
    // 缓存垃圾回收时间10分钟
    gcTime: 10 * 60 * 1000,
  });
}
