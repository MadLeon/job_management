import React from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import ActionButtonList from '../ui/ActionButtonList';

export default function JobDetailRow({ row, index, onPartEditSubmit }) {
  return (
    <TableRow>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {index + 1}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }}>
        {row.drawing_number}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.revision}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.quantity}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.delivery_required_date}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }} align="center">
        {row.status}
      </TableCell>
      <TableCell sx={{ borderBottom: 'unset' }}>
        <ActionButtonList
          type="detail"
          fileLocation={row.file_location}
          partData={row}
          onPartSubmit={onPartEditSubmit}
        />
      </TableCell>
    </TableRow>
  );
}
