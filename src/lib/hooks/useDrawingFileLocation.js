import { useQuery } from '@tanstack/react-query';

/**
 * 通过图纸号获取文件位置
 * 
 * 使用 React Query 钩子从 API 获取指定图纸号对应的文件位置
 * 支持自动缓存和重新获取，默认数据缓存时间为 5 分钟
 * 
 * @hook
 * @param {string} drawingNumber - 图纸号（例如 "GM223-1314-9"）。空值时禁用查询
 * @param {string} customerName - 可选。用于筛选文件位置的客户名称
 * @returns {Object} React Query 查询对象，包含:
 *   @returns {string|null} data - 文件位置路径，如果未找到则为 null
 *   @returns {boolean} isLoading - 加载状态标志
 *   @returns {boolean} isError - 错误状态标志
 *   @returns {Error} error - 错误对象（如果查询失败）
 *   @returns {Function} refetch - 手动重新获取数据的函数
 * 
 * @example
 * // 基础使用
 * const { data: fileLocation, isLoading } = useDrawingFileLocation('GM223-1314-9');
 * 
 * @example
 * // 带客户名称筛选
 * const { data: fileLocation, isLoading } = useDrawingFileLocation('GM223-1314-9', 'MHI-Canada');
 */
export function useDrawingFileLocation(drawingNumber, customerName) {
  return useQuery({
    queryKey: ['drawingFileLocation', drawingNumber, customerName],
    queryFn: async () => {
      let url = `/api/jobs/drawing-file-location?drawingNumber=${encodeURIComponent(drawingNumber)}`;
      if (customerName) {
        url += `&customerName=${encodeURIComponent(customerName)}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch drawing file location');
      }
      const data = await res.json();
      return data.fileLocation;
    },
    enabled: !!drawingNumber,
  });
}
