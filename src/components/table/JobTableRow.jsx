import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ActionButtonList from '../ui/ActionButtonList';
import PriorityChip from '../shared/PriorityChip';
import JobDetailTable from './JobDetailTable';
import { useAssemblies } from '../../lib/hooks/useAssemblies';

export default function JobTableRow({ row, colWidths = [] }) {
  const [open, setOpen] = React.useState(false);
  const [dynamicColWidths, setDynamicColWidths] = React.useState(colWidths);
  const cellRefs = React.useRef([]);
  const { data: assemblies = [] } = useAssemblies(open ? row.part_number : null);

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
            type="assembly"
            fileLocation={row.file_location}
            jobData={row}
            onJobSubmit={(formData) => {
              // TODO: 在这里处理表单提交逻辑，例如更新API
              console.log("Job updated:", formData);
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
