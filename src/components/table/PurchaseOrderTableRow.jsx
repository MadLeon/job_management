import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { useRouter } from 'next/router';

/**
 * 采购订单表格行组件
 */
export default function PurchaseOrderTableRow({ row, onRowClick }) {
  const router = useRouter();

  /**
   * 处理行点击事件
   */
  const handleClick = () => {
    if (onRowClick) {
      onRowClick(row.po_number);
    } else {
      router.push(`/purchase-orders/${row.po_number}`);
    }
  };

  return (
    <TableRow
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#f9f9f9'
        },
        height: '57px'
      }}
    >
      <TableCell sx={{ pl: 3 }}>{row.po_number}</TableCell>
      <TableCell>{row.oe_number || '-'}</TableCell>
      <TableCell>{row.customer_name || '-'}</TableCell>
      <TableCell>{row.contact_name || '-'}</TableCell>
    </TableRow>
  );
}
