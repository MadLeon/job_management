import { useQuery } from '@tanstack/react-query';

/**
 * 获取指定零件的子组件列表
 * 
 * 使用 React Query 钩子从 API 获取与特定零件 ID 相关的所有子组件数据
 * 基于 part_tree 表的 parent_id 关系
 * 支持自动缓存和重新获取，默认数据缓存时间为 5 分钟
 * 
 * @hook
 * @param {number} partId - 零件 ID，用于查询相关子组件。空值时禁用查询
 * @param {number} orderItemId - 订单项 ID，用于获取 delivery_required_date 和 status。可选
 * @returns {Object} React Query 查询对象，包含:
 *   @returns {Array} data - 子组件数据数组
 *   @returns {boolean} isLoading - 加载状态标志
 *   @returns {boolean} isError - 错误状态标志
 *   @returns {Error} error - 错误对象（如果查询失败）
 *   @returns {Function} refetch - 手动重新获取数据的函数
 * 
 * @example
 * // 基础使用
 * const { data: children, isLoading } = useAssemblies(123);
 * 
 * @example
 * // 带 orderItemId 使用
 * const { data: children, isLoading } = useAssemblies(123, 456);
 */
export function useAssemblies(partId, orderItemId) {
  return useQuery({
    queryKey: ['assemblies', partId, orderItemId],
    queryFn: async () => {
      let url = `/api/parts/${partId}/children`;
      if (orderItemId) {
        url += `?orderItemId=${orderItemId}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch assemblies');
      }
      return res.json();
    },
    enabled: !!partId,
  });
}
