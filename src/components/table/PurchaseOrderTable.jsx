import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import { useVirtualizer } from '@tanstack/react-virtual';
import PurchaseOrderTableHeader from './PurchaseOrderTableHeader';
import PurchaseOrderTableRow from './PurchaseOrderTableRow';
import { Box } from '@mui/material';

/**
 * 虚拟化采购订单表格组件，使用 TanStack React Virtual 实现高性能渲染
 * 支持排序，只渲染可见的行来优化大数据集的性能
 * 
 * @component
 * @param {Array} data - 待渲染的采购订单数据数组
 * @param {Boolean} isLoading - 加载状态标志
 * @param {Function} onRowClick - 行点击回调
 * @returns {JSX.Element} 虚拟化的表格组件
 */
export default function PurchaseOrderTable({ data = [], isLoading = false, onRowClick }) {
  const [order, setOrder] = React.useState('asc');
  const [orderBy, setOrderBy] = React.useState('po_number');
  const parentRef = React.useRef(null);

  /**
   * 值比较函数
   */
  const compareValues = (aVal, bVal, orderBy) => {
    // 数字比较
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal;
    }

    // 字符串比较
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal);
    }

    // 默认比较
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  };

  /**
   * 获取比较器函数
   */
  const getComparator = (order, orderBy) => {
    return (a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      // 处理 null/empty
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      let result = compareValues(aVal, bVal, orderBy);

      // 应用排序方向
      if (order === 'desc') {
        result = -result;
      }

      return result;
    };
  };

  /**
   * 处理排序请求
   */
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // 排序数据
  const sortedData = React.useMemo(() => {
    return [...data].sort(getComparator(order, orderBy));
  }, [data, order, orderBy]);

  // 初始化虚拟化器
  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 57,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? totalSize - (virtualItems?.[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer
        ref={parentRef}
        sx={{
          maxHeight: 'calc(100vh - 300px)',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <Table
          aria-label="purchase-order-table"
          sx={{
            tableLayout: 'fixed',
            '& thead': {
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'background.paper',
            }
          }}
        >
          <PurchaseOrderTableHeader
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {/* 上方空白占位 */}
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}

            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  Loading...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  No purchase orders found
                </td>
              </tr>
            ) : (
              virtualItems.map((virtualItem) => {
                const po = sortedData[virtualItem.index];
                return (
                  <PurchaseOrderTableRow
                    key={`${po.po_id}-${virtualItem.index}`}
                    row={po}
                    onRowClick={onRowClick}
                  />
                );
              })
            )}

            {/* 下方空白占位 */}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
