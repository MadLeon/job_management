import React from 'react';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import JobDetailRow from './JobDetailRow';

export default function JobDetailTable({ data = [], colWidths = [], onPartEditSubmit }) {
  const detailColumns = [
    { label: 'Item', width: 3 },
    { label: 'Detail Number', width: 4 },
    { label: 'Rev', width: 5 },
    { label: 'Qty', width: 6 },
    { label: 'Del.Req\'d', width: 7 },
    { label: 'Status', width: 8 },
    { label: 'Actions', width: 9 },
  ];

  return (
    <Table aria-label="job-details" size="small" sx={{ tableLayout: 'fixed' }}>
      <TableHead>
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
          {detailColumns.map((column, index) => (
            <TableCell
              key={column.label}
              sx={{
                width: colWidths[column.width] ? `${colWidths[column.width]}px` : 'auto',
                typography: 'regularBold',
                borderBottom: 'unset',
                ...(index === 0 && { pl: 3 }),
              }}
              align={column.label !== 'Detail Number' && column.label !== 'Actions' ? 'center' : 'left'}
            >
              {column.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, index) => (
          <JobDetailRow
            key={index}
            row={row}
            index={index}
            onPartEditSubmit={onPartEditSubmit}
          />
        ))}
      </TableBody>
    </Table>
  );
}
