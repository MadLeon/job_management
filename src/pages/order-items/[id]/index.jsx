import React from 'react';
import { Box, Chip, Container, Stack, Typography, CircularProgress } from '@mui/material';
import { useRouter } from 'next/router';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import PriorityChip from '@/components/shared/PriorityChip';
import OrderItemInformation from '@/components/itemContainer/OrderItemInformation';
import AdditionalJobInfo from '@/components/itemContainer/AdditionalJobInfo';
import { useJobDrawings } from '@/lib/hooks/useJobDrawings';
import JobCompletionChart from '@/components/itemContainer/JobCompletionChart';
import { DrawingsTable } from '@/components/table';

/**
 * 订单项目详情页面
 * 动态路由根据 id 显示特定订单项目的详细信息
 * 路由: /order-items/[id]
 * 
 * @component
 * @returns {JSX.Element} 订单项目详情页面
 */
export default function OrderItemDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [currentOrderItem, setCurrentOrderItem] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  /**
   * 获取订单项目详情
   */
  React.useEffect(() => {
    if (!id) return;

    const fetchOrderItemDetail = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/order-items/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch order item details');
        }
        const data = await response.json();
        setCurrentOrderItem(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching order item:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderItemDetail();
  }, [id]);

  /**
   * 使用 useJobDrawings 钩子获取当前订单项目的所有图纸和组件数据
   */
  const { data: drawings = [], isLoading: drawingsLoading } = useJobDrawings(id);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !currentOrderItem) {
    return (
      <Stack spacing={3}>
        <Breadcrumb
          locationLayer={['order items', id || 'Detail']}
          href={["/order-items", `/order-items/${id}`]}
        />
        <PageTitle title="Order Item Overview" />
        <ItemContainer
          title="Error"
          content={
            <Typography color="error">
              {error || 'Order item not found'}
            </Typography>
          }
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['Purchase Orders', currentOrderItem?.po_number || 'Loading', currentOrderItem?.line_number || 'Detail']}
        href={["/purchase-orders", `/purchase-orders/${currentOrderItem?.po_number}`, `/order-items/${id}`]}
      />
      <PageTitle title="Order Item Overview" />
      <ItemContainer
        title="Basic Information"
        content={<OrderItemInformation orderItemData={currentOrderItem} />}
        component={currentOrderItem ? <PriorityChip priority={currentOrderItem.priority} /> : null}
        sx={{ width: '100%' }}
      />
      <Stack direction={"row"} spacing={3}>
        <Stack spacing={3} width="40%">
          <ItemContainer
            title="Order Item Information"
            content={<AdditionalJobInfo jobData={currentOrderItem} />}
            width="100%"
          />
          <ItemContainer
            title="Item Completion"
            content={
              <JobCompletionChart jobData={currentOrderItem} />
            }
            component={<Typography variant="h3">In Progress</Typography>}
            width="100%"
          />
        </Stack>
        <ItemContainer
          title="Drawing Tracker"
          align="normal"
          content={
            <DrawingsTable
              drawings={drawings}
              isLoading={drawingsLoading}
              jobNumber={id}
            />
          }
        />
      </Stack>
    </Stack>
  );
}
