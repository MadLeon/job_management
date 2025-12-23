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

/**
 * 图纸表格组件
 * 用于在当前工作中显示相关图纸（装配细节）的详细信息
 * 
 * @component
 * @param {Array} drawings - 图纸/装配数据数组，数据结构来自 assembly_detail 表，包含:
 *   {id, drawing_number, status, updated_at, file_location, description, revision, quantity, ...}
 * @param {string} [jobId] - 当前工作ID（可选，用于后续操作）
 * @param {string} [jobNumber] - 当前工作号（用于导航到详情页面）
 * @param {string} [type='assembly'] - 图纸类型（'assembly'|'detail'）
 * @param {boolean} [isLoading=false] - 加载状态标志
 * @returns {JSX.Element} 图纸表格组件
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
   * 打开 PDF 文件
   * @param {string} fileLocation - 文件位置
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
   * 打开图纸详情
   * @param {string} jobNumber - 工作号
   * @param {string} drawingNumber - 图纸号
   */
  const handleOpenDrawingDetail = (jobNumber, drawingNumber) => {
    if (!jobNumber || !drawingNumber) return;
    router.push(`/active-jobs/${jobNumber}/${drawingNumber}`);
  };

  /**
   * 格式化日期为 "Mon. dd, yy" 格式
   * 例如: "Dec. 19, 25"
   * 
   * @param {string} dateStr - ISO格式或其他日期字符串
   * @returns {string} 格式化后的日期
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
   * 格式化时间为 "hh:mm" 格式
   * 例如: "14:30"
   * 
   * @param {string} dateStr - 包含时间的日期字符串
   * @returns {string} 格式化后的时间
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
   * 表格单元格样式 - 用于所有文本内容
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
        <DrawingsTableHeader />
        <TableBody>
          {drawings && drawings.length > 0 ? (
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
                {/* Drawing Number */}
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

                {/* Status */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    {drawing.status || '-'}
                  </Typography>
                </TableCell>

                {/* Last Seen */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    N/A
                  </Typography>
                </TableCell>

                {/* Date (Last Updated) */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    {formatDate(drawing.updated_at)}
                  </Typography>
                </TableCell>

                {/* Time (Last Updated) */}
                <TableCell>
                  <Typography variant="caption" sx={cellTypographySx}>
                    {formatTime(drawing.updated_at)}
                  </Typography>
                </TableCell>

                {/* Action */}
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
