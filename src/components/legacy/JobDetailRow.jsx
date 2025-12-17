import React from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import ActionButtonList from './ActionButtonList';

export default function JobDetailRow({ row, index }) {
  return (
    <TableRow>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {index + 1}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }}>
        {row.part_number}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.revision}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.job_quantity}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.delivery_required_date}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        inspection
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }}>
        <ActionButtonList type="detail" />
      </TableCell>
    </TableRow>
  );
}
