import React from 'react';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

export default function JobTableHeader() {
  const columns = [
    { label: 'Job Number', width: '10%', align: 'left' },
    { label: 'PO Number', width: '15%', align: 'left' },
    { label: 'Customer', width: '10%', align: 'left' },
    { label: 'Line', width: '5%', align: 'center' },
    { label: 'Part Number', width: '20%', align: 'left' },
    { label: 'Rev', width: '5%', align: 'center' },
    { label: 'Qty', width: '5%', align: 'center' },
    { label: 'Del. Req\'d', width: '7.5%', align: 'center' },
    { label: 'Priority', width: '7.5%', align: 'center' },
    { label: 'Actions', width: '15%', align: 'left' },
  ];

  return (
    <TableHead>
      <TableRow>
        {columns.map((column) => (
          <TableCell
            key={column.label}
            size="medium"
            align={column.align}
            sx={{
              ...(column.label === 'Job Number' && { pl: 3 }),
              typography: 'regularBold',
              width: column.width,
            }}
          >
            {column.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
