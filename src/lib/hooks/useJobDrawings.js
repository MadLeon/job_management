import { useQuery } from '@tanstack/react-query';

/**
 * 获取指定工作的所有图纸和组件
 * 
 * 通过 job_number 查询该工作下的所有订单项及其图纸信息
 * 
 * @hook
 * @param {string} jobNumber - 工作号
 * @returns {Object} React Query 查询对象，包含:
 *   @returns {Array} data - 图纸数据数组
 *   @returns {boolean} isLoading - 加载状态标志
 *   @returns {boolean} isError - 错误状态标志
 *   @returns {Error} error - 错误对象（如果查询失败）
 * 
 * @example
 * const { data: drawings, isLoading } = useJobDrawings('JOB-123');
 */
export function useJobDrawings(jobNumber) {
  return useQuery({
    queryKey: ['job-drawings', jobNumber],
    queryFn: async () => {
      if (!jobNumber) return [];
      const res = await fetch(`/api/jobs/${jobNumber}/drawings`);
      if (!res.ok) {
        throw new Error('Failed to fetch job drawings');
      }
      return res.json();
    },
    enabled: !!jobNumber,
  });
}
