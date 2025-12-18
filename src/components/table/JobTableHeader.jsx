import React from 'react';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import { visuallyHidden } from '@mui/utils';
import { Box } from '@mui/material';

export default function JobTableHeader({ order = 'asc', orderBy = 'job_number', onRequestSort = () => { } }) {
  const columns = [
    { id: 'job_number', label: 'Job Number', width: '10%', align: 'left', sortable: true },
    { id: 'po_number', label: 'PO Number', width: '15%', align: 'left', sortable: false },
    { id: 'customer_name', label: 'Customer', width: '10%', align: 'left', sortable: true },
    { id: 'line', label: 'Line', width: '5%', align: 'center', sortable: false },
    { id: 'part_number', label: 'Part Number', width: '20%', align: 'left', sortable: false },
    { id: 'rev', label: 'Rev', width: '5%', align: 'center', sortable: false },
    { id: 'qty', label: 'Qty', width: '5%', align: 'center', sortable: false },
    { id: 'delivery_required_date', label: 'Del. Req\'d', width: '7.5%', align: 'center', sortable: true },
    { id: 'priority', label: 'Priority', width: '7.5%', align: 'center', sortable: true },
    { id: 'actions', label: 'Actions', width: '15%', align: 'left', sortable: false },
  ];

  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {columns.map((column) => (
          <TableCell
            key={column.id}
            size="medium"
            align={column.align}
            sortDirection={orderBy === column.id ? order : false}
            sx={{
              ...(column.id === 'job_number' && { pl: 3 }),
              typography: 'regularBold',
              width: column.width,
              backgroundColor: 'background.paper',
            }}
          >
            {column.sortable ? (
              <TableSortLabel
                active={orderBy === column.id}
                direction={orderBy === column.id ? order : 'asc'}
                onClick={createSortHandler(column.id)}
              >
                {column.label}
                {orderBy === column.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
