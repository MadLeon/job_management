import React from 'react';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

export default function DrawingsTableHeader() {
  const columns = [
    { id: 'drawing_number', label: 'Drawing Number', width: '35%' },
    { id: 'status', label: 'Status', width: '10%' },
    { id: 'last_seen', label: 'Last Seen', width: '15%' },
    { id: 'last_seen_date', label: 'Date', width: '10%' },
    { id: 'last_seen_time', label: 'Time', width: '7.5%' },
    { id: 'actions', label: 'Actions', width: '20%' },
  ];

  return (
    <TableHead>
      <TableRow>
        {columns.map((column) => (
          <TableCell
            key={column.id}
            size="medium"
            align={column.align}
            sx={{
              ...(column.id === 'drawing_number' && { pl: 3, pt: 3 }),
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
