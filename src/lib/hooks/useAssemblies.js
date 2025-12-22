import { useQuery } from '@tanstack/react-query';

/**
 * 获取指定零件号的装配体列表
 * 
 * 使用 React Query 钩子从 API 获取与特定零件号相关的所有装配体数据
 * 支持自动缓存和重新获取，默认数据缓存时间为 5 分钟
 * 
 * @hook
 * @param {string} partNumber - 零件号，用于查询相关装配体。空值时禁用查询
 * @returns {Object} React Query 查询对象，包含:
 *   @returns {Array} data - 装配体数据数组
 *   @returns {boolean} isLoading - 加载状态标志
 *   @returns {boolean} isError - 错误状态标志
 *   @returns {Error} error - 错误对象（如果查询失败）
 *   @returns {Function} refetch - 手动重新获取数据的函数
 * 
 * @example
 * // 基础使用
 * const { data: assemblies, isLoading } = useAssemblies('GM223-1314-9');
 * 
 * @example
 * // 在条件下使用
 * const { data, isLoading, error } = useAssemblies(selectedPartNumber);
 * if (isLoading) return <div>加载中...</div>;
 * if (error) return <div>错误: {error.message}</div>;
 * return <div>{data?.length} 个装配体</div>;
 */
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
