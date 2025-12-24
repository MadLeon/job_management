import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Stack,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ActionButtonList from '../common/ActionButtonList';
import DrawingsTableHeader from './DrawingsTableHeader';
import ProductionHistory from '../itemContainer/ProductionHistory';

/**
 * 生产历史表格组件
 * 用于在当前工作详情页面中显示装配细节（assembly_detail 表数据）的详细信息
 * 支持多个操作: PDF 预览、打开图纸详情页面
 * 
 * @component
 * @param {Array<Object>} [drawings=[]] - 装配细节数据数组，数据来自 assembly_detail 表，包含以下属性:
 *   - id {number} - 装配细节ID
 *   - drawing_number {string} - 图纸号（唯一标识符，链接到 detail_drawing 表）
 *   - status {string} - 状态（例如: Pending, In Progress, Completed）
 *   - updated_at {string} - 最后更新时间（ISO 8601 格式）
 *   - file_location {string|null} - 文件路径（用于PDF预览）
 *   - quantity {string} - 数量
 *   - created_at {string} - 创建时间（ISO 8601 格式）
 *   - part_number {string} - 零件号（链接到 jobs 表）
 *   - delivery_required_date {string|null} - 所需交货日期（YYYY-MM-DD）
 * @param {string|null} [jobId=null] - 当前工作ID（可选，用于后续操作）
 * @param {string|null} [jobNumber=null] - 当前工作号（必需，用于路由导航到装配细节页面）
 * @param {string} [type='drawing'] - 图纸类型（目前默认为 'drawing'，不主要使用）
 * @param {boolean} [isLoading=false] - 加载状态标志（显示 Loading 或 No drawings 消息）
 * @returns {JSX.Element} MUI TableContainer 组件，包含可编辑的装配细节表格
 */
export default function DrawingsTable({
  drawings = [],
  jobId = null,
  jobNumber = null,
  type = 'drawing',
  isLoading = false,
}) {
  const router = useRouter();

  /**
   * 打开 PDF 文件预览
   * 调用后端 API 获取 PDF 文件，然后在新标签页中打开
   * 
   * @async
   * @param {string|null} fileLocation - 文件位置路径（assembly_detail.file_location）
   * @throws 无文件位置或 API 失败时输出控制台错误
   * @returns {Promise<void>}
   */
  const handleOpenPDF = async (fileLocation) => {
    if (!fileLocation) return;
    try {
      const response = await fetch(`/api/jobs/pdf?fileLocation=${encodeURIComponent(fileLocation)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // 清理对象 URL（在文件加载后）
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        console.error('Failed to fetch file for preview');
      }
    } catch (error) {
      console.error('Error opening file preview:', error);
    }
  };

  /**
   * 打开装配细节详情页面
   * 路由导航到: /active-jobs/[jobNumber]/[drawingNumber]
   * 
   * @param {string|null} jobNumber - 工作号（来自 jobs 表的 job_number）
   * @param {string|null} drawingNumber - 图纸号（来自 assembly_detail 的 drawing_number）
   * @returns {Promise<void>} 路由导航
   */
  const handleOpenDrawingDetail = (jobNumber, drawingNumber) => {
    if (!jobNumber || !drawingNumber) return;
    router.push(`/active-jobs/${jobNumber}/${drawingNumber}`);
  };

  /**
   * 格式化日期字符串为 "Mon. dd, yy" 格式
   * 示例: "2025-12-19" 或 ISO 格式 → "Dec. 19, 25"
   * 
   * @param {string|null} dateStr - ISO 8601 格式日期字符串或其他日期格式
   * @returns {string} 格式化后的日期字符串，失败时返回 '-'
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${month}. ${day}, ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  /**
   * 格式化时间为 24 小时制 "hh:mm" 格式
   * 示例: "2025-12-19T14:30:22" → "14:30"
   * 
   * @param {string|null} dateStr - 包含时间的日期时间字符串（ISO 8601 或数据库格式）
   * @returns {string} 格式化后的时间，失败时返回 '-'
   */
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '-';
    }
  };

  /**
   * 表格单元格文本样式常量
   * 应用于所有表格数据单元格（TableCell）中的 Typography 组件
   * 
   * @type {Object} MUI sx 属性对象
   */
  const cellTypographySx = {
    color: 'text.secondary',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  };

  return (
    <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
      <Table aria-label="drawings table" size="small" sx={{ '& .MuiTableCell-root': { border: 'none' } }}>
        <ProductionHistoryTableHeader />
        <TableBody>
          {drawings && drawings.length > 0 ? (
            // 遍历装配细节列表，为每条记录渲染一行表格
            drawings.map((drawing, index) => (
              <TableRow
                key={drawing.drawing_number || index}
                sx={{
                  '&:hover': {
                    backgroundColor: '#f9f9f9',
                  },
                  '& .MuiTableCell-root': {
                    py: 0.5,
                  },
                }}
              >
                {/* 图纸号列 - 如果有 jobNumber，点击可导航到装配细节页面 */}
                <TableCell sx={{ pl: 3 }}>
                  {jobNumber ? (
                    <Link
                      href={`/active-jobs/${jobNumber}/${drawing.drawing_number}`}
                      passHref
                      legacyBehavior
                    >
                      <MuiLink
                        component="a"
                        sx={{
                          color: '#03229F',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          letterSpacing: '0.5px',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {drawing.drawing_number || '-'}
                      </MuiLink>
                    </Link>
                  ) : (
                    <Typography variant="caption" sx={cellTypographySx}>
                      {drawing.drawing_number || '-'}
                    </Typography>
                  )}
                </TableCell>

                {/* 状态列 - 来自 assembly_detail.status */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    {drawing.status || '-'}
                  </Typography>
                </TableCell>

                {/* 最后查看列 - 目前显示 N/A，保留以备后续扩展 */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    N/A
                  </Typography>
                </TableCell>

                {/* 日期列 - 显示 assembly_detail.updated_at 的日期部分 */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    {formatDate(drawing.updated_at)}
                  </Typography>
                </TableCell>

                {/* 时间列 - 显示 assembly_detail.updated_at 的时间部分 */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    {formatTime(drawing.updated_at)}
                  </Typography>
                </TableCell>

                {/* 操作列 - PDF 预览和打开详情页面 */}
                <TableCell align="center">
                  <ActionButtonList
                    buttons={['pdf', 'openNew']}
                    handlers={{
                      onPdfClick: () => handleOpenPDF(drawing.file_location),
                      onOpenNewClick: () => handleOpenDrawingDetail(jobNumber, drawing.drawing_number),
                    }}
                    disabledButtons={{
                      pdf: !drawing.file_location,
                      openNew: !jobNumber || !drawing.drawing_number,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            // 无数据或加载中显示的空状态行
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {isLoading ? 'Loading' : 'No drawings available'}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
