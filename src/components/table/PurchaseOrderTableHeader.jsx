import React from 'react';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import { visuallyHidden } from '@mui/utils';
import { Box } from '@mui/material';

/**
 * 采购订单表格头部组件
 */
export default function PurchaseOrderTableHeader({ order = 'asc', orderBy = 'po_number', onRequestSort = () => { } }) {
  const columns = [
    { id: 'po_number', label: 'PO Number', width: '25%', align: 'left', sortable: false },
    { id: 'oe_number', label: 'OE Number', width: '25%', align: 'left', sortable: true },
    { id: 'customer_name', label: 'Customer', width: '25%', align: 'left', sortable: true },
    { id: 'contact_name', label: 'Contact', width: '25%', align: 'left', sortable: false },
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
              ...(column.id === 'po_number' && { pl: 3 }),
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
