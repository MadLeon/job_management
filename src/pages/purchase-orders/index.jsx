/**
 * 采购订单列表页面
 * 显示所有采购订单，支持搜索和过滤
 * 路由: /purchase-orders
 * 
 * @component
 * @returns {JSX.Element} 采购订单列表页面
 */

import React from 'react';
import { Stack, Table, TableBody, TableContainer, TableHead, TableRow, TableCell, Paper, CircularProgress, Box, Button } from '@mui/material';
import { useRouter } from 'next/router';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';

/**
 * 采购订单列表页面
 */
export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  /**
   * 获取采购订单列表数据
   */
  React.useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/purchase-orders');
        if (!response.ok) {
          throw new Error('Failed to fetch purchase orders');
        }
        const data = await response.json();
        setPurchaseOrders(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase orders:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, []);

  /**
   * 处理点击采购订单行的事件
   * @param {string} poNumber - 采购订单号
   */
  const handleRowClick = (poNumber) => {
    router.push(`/purchase-orders/${poNumber}`);
  };

  const tableContent = (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>OE Number</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="center">Jobs</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                <CircularProgress size={40} />
              </TableCell>
            </TableRow>
          ) : purchaseOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                No purchase orders found
              </TableCell>
            </TableRow>
          ) : (
            purchaseOrders.map((po) => (
              <TableRow
                key={po.po_id}
                onClick={() => handleRowClick(po.po_number)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#f9f9f9'
                  }
                }}
              >
                <TableCell>{po.po_number}</TableCell>
                <TableCell>{po.oe_number || '-'}</TableCell>
                <TableCell>{po.customer_name || '-'}</TableCell>
                <TableCell>{po.contact_name || '-'}</TableCell>
                <TableCell align="center">{po.job_count || 0}</TableCell>
                <TableCell>
                  {po.created_at ? new Date(po.created_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      backgroundColor: po.is_active ? '#e8f5e9' : '#ffebee',
                      color: po.is_active ? '#2e7d32' : '#c62828'
                    }}
                  >
                    {po.is_active ? 'Active' : 'Inactive'}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['Purchase Orders']}
        href={['/purchase-orders']}
      />
      <PageTitle title="Purchase Orders" />
      <ItemContainer
        title="All Purchase Orders"
        content={tableContent}
      />
    </Stack>
  );
}
