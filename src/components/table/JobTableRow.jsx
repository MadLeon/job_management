import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useRouter } from 'next/router';
import ActionButtonList from '../common/ActionButtonList';
import PriorityChip from '../shared/PriorityChip';
import JobDetailTable from './JobDetailTable';
import { useAssemblies } from '../../lib/hooks/useAssemblies';
import { useDrawingFileLocation } from '../../lib/hooks/useDrawingFileLocation';

export default function JobTableRow({ row, onEditJobClick, colWidths = [], onDeleteConfirm }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dynamicColWidths, setDynamicColWidths] = React.useState(colWidths);
  const cellRefs = React.useRef([]);
  const { data: assemblies = [] } = useAssemblies(open ? row.part_id : null, open ? row.order_item_id : null);

  // 使用 React Query hook 获取文件位置
  const { data: fileLocation, isLoading: isLoadingFile } = useDrawingFileLocation(row.part_number);

  // 判断是否有assembly details
  const hasAssemblyDetails = row.has_assembly_details === 1;

  // 当单元格被渲染时，更新列宽
  React.useEffect(() => {
    const updateWidths = () => {
      const widths = cellRefs.current.map((cell) => cell?.offsetWidth || 0);
      if (widths.some(w => w > 0)) {
        setDynamicColWidths(widths);
      } else {
        setDynamicColWidths(colWidths);
      }
    };

    updateWidths();
  }, [colWidths]);

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
   * 编辑工作
   * @param {object} row - 工作数据
   */
  const handleEdit = (row) => {
    onEditJobClick(row);
  };

  /**
   * 删除工作
   * @param {number} id - 工作ID
   */
  const handleDelete = (id) => {
    // TODO: 实现删除逻辑，例如显示确认对话框
    console.log('Delete job:', id);
  };

  const handleDeleteClick = (deleteData) => {
    onDeleteConfirm(deleteData);
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
    router.push(`/active-jobs/${jobNumber}`);
  };

  return (
    <React.Fragment>
      <TableRow sx={{ borderBottom: 'unset' }}>
        <TableCell
          align="center"
          ref={(el) => (cellRefs.current[0] = el)}
          sx={{
            ':hover': { cursor: hasAssemblyDetails ? 'pointer' : 'default' },
            typography: 'regularBold',
            borderBottom: 'unset',
          }}
          onClick={() => hasAssemblyDetails && setOpen(!open)}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton
              aria-label="expand row"
              size="small"
              disabled={!hasAssemblyDetails}
              sx={{ visibility: hasAssemblyDetails ? 'visible' : 'hidden' }}
            >
              {open ? (
                <KeyboardArrowUpIcon fontSize="inherit" />
              ) : (
                <KeyboardArrowDownIcon fontSize="inherit" />
              )}
            </IconButton>
            {row.job_number}
          </Stack>
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[1] = el)} sx={{ borderBottom: 'unset' }}>
          {row.po_number}
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[2] = el)} sx={{ borderBottom: 'unset' }}>
          {row.customer_name}
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[3] = el)} sx={{ borderBottom: 'unset' }} align="center">
          {row.line_number}
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[4] = el)} sx={{ borderBottom: 'unset' }}>
          {row.part_number}
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[5] = el)} sx={{ borderBottom: 'unset' }} align="center">
          {row.revision}
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[6] = el)} sx={{ borderBottom: 'unset' }} align="center">
          {row.job_quantity}
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[7] = el)} sx={{ borderBottom: 'unset' }} align="center">
          {row.delivery_required_date}
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[8] = el)} sx={{ borderBottom: 'unset' }} align="center">
          <PriorityChip priority={row.priority} />
        </TableCell>
        <TableCell ref={(el) => (cellRefs.current[9] = el)} sx={{ borderBottom: 'unset' }}>
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

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} />
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} />
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} />
        <TableCell style={{ padding: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <JobDetailTable data={assemblies} colWidths={dynamicColWidths} />
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}
