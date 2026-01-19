/**
 * 采购订单列表页面
 * 显示所有采购订单，支持搜索和过滤
 * 路由: /purchase-orders
 * 
 * @component
 * @returns {JSX.Element} 采购订单列表页面
 */

import React from 'react';
import { Stack, Button } from '@mui/material';
import { useRouter } from 'next/router';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/itemContainer';
import SearchBox from '@/components/search/SearchBox';
import PurchaseOrderTable from '@/components/table/PurchaseOrderTable';

/**
 * 采购订单列表页面
 */
export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [searchFilter, setSearchFilter] = React.useState(null);

  /**
   * 处理搜索框选择回调
   * @param {Object} selectedPO - 选中的采购订单记录
   */
  const handleSearchSelect = React.useCallback((selectedPO) => {
    console.log('[PurchaseOrders] 搜索选择回调:', selectedPO);
    setSearchFilter(selectedPO);
  }, []);

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

  /**
   * 根据搜索过滤条件过滤采购订单列表
   */
  const filteredPurchaseOrders = React.useMemo(() => {
    return purchaseOrders.filter(po => {
      // 搜索过滤：如果用户选择了搜索结果，则仅显示匹配的记录
      if (searchFilter) {
        if (po.po_number !== searchFilter.po_number) {
          return false;
        }
      }
      return true;
    });
  }, [purchaseOrders, searchFilter]);

  return (
    <Stack spacing={3}>
      <Breadcrumb
        locationLayer={['Purchase Orders']}
        href={['/purchase-orders']}
      />
      <PageTitle title="Purchase Orders" />
      <ItemContainer
        content={
          <Stack direction="row" width="100%" sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={2}>
              <SearchBox onSelect={handleSearchSelect} />
              <Button variant="text" startIcon={<FilterAltIcon />}>
                Filter
              </Button>
            </Stack>
          </Stack>
        }
      />
      <ItemContainer
        title="All Purchase Orders"
        content={
          <PurchaseOrderTable
            data={filteredPurchaseOrders}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
        }
      />
    </Stack>
  );
}
