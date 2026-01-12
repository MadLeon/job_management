import React from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import ActionButtonList from '../common/ActionButtonList';
import { useDrawingFileLocation } from '../../lib/hooks/useDrawingFileLocation';

export default function JobDetailRow({ row, index, onPartEditSubmit }) {
  // 使用 React Query hook 获取文件位置
  const { data: fileLocation, isLoading: isLoadingFile } = useDrawingFileLocation(row.drawing_number);

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
   * 编辑部件
   * @param {object} row - 部件数据
   */
  const handleEdit = (row) => {
    if (onPartEditSubmit) {
      onPartEditSubmit(row);
    }
  };

  /**
   * 删除部件
   * @param {number} id - 部件ID
   */
  const handleDelete = (id) => {
    // TODO: 实现删除逻辑
    console.log('Delete part:', id);
  };

  return (
    <TableRow>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {index + 1}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }}>
        {row.drawing_number}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.revision}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.quantity}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.delivery_required_date}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.status}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }}>
        <ActionButtonList
          buttons={['pdf', 'edit', 'delete']}
          handlers={{
            onPdfClick: () => handleOpenPDF(fileLocation),
            onEditClick: () => handleEdit(row),
            onDeleteClick: () => handleDelete(row.id),
          }}
          disabledButtons={{
            pdf: !fileLocation || isLoadingFile,
          }}
        />
      </TableCell>
    </TableRow>
  );
}
