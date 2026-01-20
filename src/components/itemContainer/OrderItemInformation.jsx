import React from 'react';
import { Stack } from '@mui/material';
import InfoField from './InfoField';

/**
 * 订单项目信息展示组件
 * 以行布局展示订单项目的关键信息字段
 * 
 * @component
 * @param {Object} orderItemData - 订单项目数据对象
 * @returns {JSX.Element} 订单项目信息行布局
 */
export default function OrderItemInformation({ orderItemData = null }) {
  /**
   * 计算完成百分比
   * TODO: 后期实现 - 根据已完成工作 / 总工作计算
   * @returns {string} 完成百分比字符串
   */
  const getCompletionPercentage = () => {
    // TODO: 实现完成百分比计算逻辑
    return '';
  };

  /**
   * 格式化日期字符串
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <Stack
      direction="row"
      width="100%"
      sx={{
        p: 2.5,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <InfoField label="PO Number" value={orderItemData?.po_number} align="left" />
      <InfoField label="Job Number" value={orderItemData?.job_number} align="center" />
      <InfoField label="Line Number" value={orderItemData?.line_number} align="center" />
      <InfoField label="Part Number" value={orderItemData?.drawing_number} align="left" />
      <InfoField label="Revision" value={orderItemData?.revision} align="center" />
      <InfoField label="Qty" value={orderItemData?.quantity} align="center" />
      <InfoField label="Delivery Date" value={formatDate(orderItemData?.delivery_required_date)} align="center" />
      <InfoField label="Completion" value={getCompletionPercentage()} align="center" />
    </Stack>
  );
}
