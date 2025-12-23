import React from 'react';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

export default function ProductionHistoryTableHeader() {
  const columns = [
    { id: 'po_number', label: 'PO Number', width: '35%' },
    { id: 'revision', label: 'Rev Number', width: '15%' },
    { id: 'quantity', label: 'Qty', width: '12.5%' },
    { id: 'working_time', label: 'Working Time', width: '7.5%' },
    { id: 'author', label: 'Author', width: '7.5%' },
    { id: 'created_at', label: 'Create Time', width: '10%' },
    { id: 'updated_at', label: 'Update Time', width: '10%' },
  ];

  return (
    <TableHead>
      <TableRow>
        {columns.map((column) => (
          <TableCell
            key={column.id}
            size="small"
            align={column.align}
            sx={{
              ...(column.id === 'po_number' && { pl: 3, pt: 3 }),
              typography: 'regularBold',
              width: column.width,
              backgroundColor: 'background.paper',
            }}
          >
            {column.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
