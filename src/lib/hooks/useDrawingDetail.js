import { useQuery } from '@tanstack/react-query';

/**
 * 获取图纸详细信息的自定义 Hook
 *
 * 该 Hook 使用 React Query 从 /api/drawings/detail 端点获取图纸元数据
 * 自动处理加载状态、错误处理和缓存管理
 *
 * 特性:
 *   - 5 分钟 staleTime (来自全局 queryClient 配置)
 *   - 10 分钟 gcTime (垃圾回收时间)
 *   - 自动错误处理和重试
 *   - 仅在 drawing_number 存在时发起请求
 *
 * @param {string} drawingNumber - 图纸号，用于查询数据库
 *
 * @returns {Object} Query 对象
 * @returns {Object} result.data - 图纸详细信息对象
 *   @returns {number} result.data.drawing_id - 图纸 ID
 *   @returns {string} result.data.drawing_number - 图纸号
 *   @returns {string} result.data.description - 图纸描述
 *   @returns {string} result.data.revision - 版本号
 *   @returns {0|1} result.data.isAssembly - 是否装配图（1=是 0=否）
 *   @returns {string} result.data.created_at - 创建时间
 *   @returns {string} result.data.updated_at - 更新时间
 * @returns {boolean} result.isLoading - 数据加载中
 * @returns {boolean} result.isError - 是否出错
 * @returns {Error} result.error - 错误对象
 * @returns {string} result.status - 查询状态 ('pending'|'error'|'success')
 *
 * @example
 * const { data: drawing, isLoading, error } = useDrawingDetail('ABC-123');
 * if (isLoading) return <div>加载中...</div>;
 * if (error) return <div>错误: {error.message}</div>;
 * return <div>{drawing.description}</div>;
 */
export function useDrawingDetail(drawingNumber) {
  return useQuery({
    queryKey: ['drawingDetail', drawingNumber],
    queryFn: async () => {
      const response = await fetch(
        `/api/drawings/detail?drawing_number=${encodeURIComponent(drawingNumber)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch drawing details');
      }

      return response.json();
    },
    enabled: !!drawingNumber, // 仅在 drawingNumber 存在时发起请求
  });
}
