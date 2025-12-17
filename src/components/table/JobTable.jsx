import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import JobTableHeader from './JobTableHeader';
import JobTableRow from './JobTableRow';

export default function JobTable({ data = [], isLoading = false }) {
  // 用 ref 存储每个主表格列
  const cellRefs = React.useRef([]);
  const [colWidths, setColWidths] = React.useState([]);

  // 页面渲染完成后以及窗口变化时更新列宽
  React.useEffect(() => {
    const updateWidths = () => {
      const widths = cellRefs.current.map((cell) => cell?.offsetWidth || 0);
      setColWidths(widths);
    };

    // 初次渲染获取宽度
    updateWidths();

    // 监听窗口变化
    window.addEventListener('resize', updateWidths);
    return () => window.removeEventListener('resize', updateWidths);
  }, []);

  return (
    <TableContainer component={Paper}>
      <Table aria-label="job-table" sx={{ tableLayout: 'fixed' }}>
        <JobTableHeader />
        <TableBody>
          {data.map((row, index) => (
            <JobTableRow
              key={index}
              row={row}
              colWidths={colWidths}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
