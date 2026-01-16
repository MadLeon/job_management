/**
 * 采购订单详情页面
 * 根据采购订单号显示采购订单的详细信息
 * 路由: /purchase-orders/[po_number]
 * 
 * @component
 * @returns {JSX.Element} 采购订单详情页面
 */

import React from 'react';
import { Box, Stack, Typography, Paper, Table, TableBody, TableContainer, TableHead, TableRow, TableCell, CircularProgress, Chip } from '@mui/material';
import { useRouter } from 'next/router';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import InfoField from '@/components/itemContainer/InfoField';

/**
 * 采购订单详情页面
 */
export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  // 支持两种路由参数：po_number (来自 /purchase-orders/[po_number]) 或 id (来自 /purchase-orders-detail/[id])
  const poIdentifier = router.query.po_number || router.query.id;
  const [purchaseOrder, setPurchaseOrder] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  /**
   * 获取采购订单详情
   */
  React.useEffect(() => {
    if (!poIdentifier) return;

    const fetchPurchaseOrderDetail = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/purchase-orders/${poIdentifier}`);
        if (!response.ok) {
          throw new Error('Failed to fetch purchase order details');
        }
        const data = await response.json();
        setPurchaseOrder(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching purchase order:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseOrderDetail();
  }, [poIdentifier]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <Stack spacing={3}>
        <Breadcrumb
          locationLayer={['Purchase Orders', poIdentifier || 'Detail']}
          href={['/purchase-orders', `/purchase-orders/${poIdentifier}`]}
        />
        <PageTitle title="Purchase Order Detail" />
        <ItemContainer
          title="Error"
          content={
            <Typography color="error">
              {error || 'Purchase order not found'}
            </Typography>
          }
        />
      </Stack>
    );
  }

  /**
   * 基本信息组件
   */
  const basicInfoContent = (
    <Stack
      direction="row"
      width="100%"
      sx={{
        p: 2.5,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <InfoField label="PO Number" value={purchaseOrder.po_number} align="left" />
      <InfoField label="OE Number" value={purchaseOrder.oe_number} align="center" />
      <InfoField label="Customer" value={purchaseOrder.customer_name} align="center" />
      <InfoField label="Contact Name" value={purchaseOrder.contact_name} align="center" />
      <InfoField label="Contact Email" value={purchaseOrder.contact_email} align="center" />
      <InfoField label="Completion" value="0%" align="center" />
    </Stack>
  );

  /**
   * 关联的工作订单表格
   */
  const jobsTableContent = (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Job Number</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Line</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Part Number</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Revision</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="center">Qty</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Delivery Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {purchaseOrder.jobs && purchaseOrder.jobs.length > 0 ? (
            purchaseOrder.jobs.map((job, index) => (
              <TableRow
                key={index}
                onClick={() => router.push(`/order-items/${job.job_number}`)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#f9f9f9'
                  }
                }}
              >
                <TableCell sx={{ fontWeight: '500' }}>{job.job_number}</TableCell>
                <TableCell>{job.line_number || '-'}</TableCell>
                <TableCell>{job.drawing_number || '-'}</TableCell>
                <TableCell>{job.revision || '-'}</TableCell>
                <TableCell align="center">{job.quantity || 0}</TableCell>
                <TableCell>
                  <Chip
                    label={job.status || 'pending'}
                    size="small"
                    variant="outlined"
                    color={
                      job.status === 'completed'
                        ? 'success'
                        : job.status === 'in-progress'
                          ? 'warning'
                          : 'default'
                    }
                  />
                </TableCell>
                <TableCell>
                  {job.delivery_required_date
                    ? new Date(job.delivery_required_date).toLocaleDateString()
                    : '-'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                No associated jobs found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['Purchase Orders', poIdentifier || 'Detail']}
        href={['/purchase-orders', `/purchase-orders/${poIdentifier}`]}
      />
      <PageTitle title="Purchase Order" />
      <ItemContainer
        title="Basic Information"
        content={basicInfoContent}
        sx={{ width: '100%' }}
      />
      <ItemContainer
        title={`Job List (${purchaseOrder.jobs?.length || 0})`}
        content={jobsTableContent}
      />
    </Stack>
  );
}
