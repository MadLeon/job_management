import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Link from '@mui/material/Link';
import { useRouter } from 'next/router';
import ActionButtonList from '../common/ActionButtonList';
import PriorityChip from '../shared/PriorityChip';
import { useDrawingFileLocation } from '../../lib/hooks/useDrawingFileLocation';

/**
 * 工作表格行组件 - 简化版本（无展开/嵌套）
 */
export default function JobTableRow({ row, onEditJobClick, onDeleteConfirm }) {
  const router = useRouter();

  // 使用 React Query hook 获取文件位置
  const { data: fileLocation, isLoading: isLoadingFile } = useDrawingFileLocation(row.part_number);

  /**
   * 编辑工作
   * @param {object} row - 工作数据
   */
  const handleEdit = (row) => {
    onEditJobClick(row);
  };

  const handleDeleteClick = (deleteData) => {
    onDeleteConfirm(deleteData);
  };

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
   * 添加部件
   * @param {object} row - 工作数据
   */
  const handleAddPart = (row) => {
    // TODO: 实现添加部件逻辑，例如打开添加模态框
    console.log('Add part to job:', row.job_number);
  };

  /**
   * 打开工作详情
   * @param {string} jobNumber - 工作号
   */
  const handleOpenJob = (jobNumber) => {
    if (!jobNumber) return;
    router.push(`/active-jobs/${jobNumber}`);
  };

  /**
   * 打开采购订单详情
   * @param {string} poNumber - 采购订单号
   */
  const handleOpenPurchaseOrder = (poNumber) => {
    if (!poNumber) return;
    router.push(`/purchase-orders/${poNumber}`);
  };

  /**
   * 打开 drawing 详情页
   * @param {string} jobNumber - 工作号
   * @param {string} drawingNumber - drawing 号
   */
  const handleOpenDrawing = (jobNumber, drawingNumber) => {
    if (!jobNumber || !drawingNumber) return;
    router.push(`/active-jobs/${jobNumber}/${drawingNumber}`);
  };

  return (
    <TableRow
      sx={{
        '&:hover': {
          backgroundColor: '#f9f9f9'
        },
        height: '57px'
      }}
    >
      <TableCell
        align="center"
        sx={{
          typography: 'regularBold',
        }}
      >
        <Link
          component="button"
          variant="body2"
          onClick={(e) => {
            e.preventDefault();
            handleOpenJob(row.job_number);
          }}
          sx={{
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: 'bold',
            '&:hover': {
              opacity: 0.8,
            },
          }}
        >
          {row.job_number}
        </Link>
      </TableCell>
      <TableCell>
        {row.po_number ? (
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.preventDefault();
              handleOpenPurchaseOrder(row.po_number);
            }}
            sx={{
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            {row.po_number}
          </Link>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell>
        {row.customer_name}
      </TableCell>
      <TableCell align="center">
        {row.line_number}
      </TableCell>
      <TableCell>
        <Link
          component="button"
          variant="body2"
          onClick={(e) => {
            e.preventDefault();
            handleOpenDrawing(row.job_number, row.part_number);
          }}
          sx={{
            cursor: 'pointer',
            textDecoration: 'underline',
            '&:hover': {
              opacity: 0.8,
            },
          }}
        >
          {row.part_number}
        </Link>
      </TableCell>
      <TableCell align="center">
        {row.revision}
      </TableCell>
      <TableCell align="center">
        {row.job_quantity}
      </TableCell>
      <TableCell align="center">
        {row.delivery_required_date}
      </TableCell>
      <TableCell align="center">
        <PriorityChip priority={row.priority} />
      </TableCell>
      <TableCell>
        <ActionButtonList
          buttons={['pdf', 'edit', 'delete', 'add', 'openNew']}
          handlers={{
            onPdfClick: () => handleOpenPDF(fileLocation),
            onEditClick: () => handleEdit(row),
            onDeleteClick: () => handleDeleteClick({ title: 'Deletion Confirm', message: 'Are you sure you want to delete this job?', itemName: row.job_number, jobNumber: row.job_number }),
            onAddClick: () => handleAddPart(row),
            onOpenNewClick: () => handleOpenJob(row.job_number),
          }}
          disabledButtons={{
            pdf: !fileLocation || isLoadingFile,
          }}
        />
      </TableCell>
    </TableRow>
  );
}
