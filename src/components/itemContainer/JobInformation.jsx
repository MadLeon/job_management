import React from 'react';
import { Stack } from '@mui/material';
import InfoField from './InfoField';

/**
 * 工作信息展示组件
 * 以行布局展示工作的关键信息字段
 * 
 * @component
 * @param {Object} jobData - 工作数据对象
 * @returns {JSX.Element} 工作信息行布局
 */
export default function JobInformation({ jobData }) {
  /**
   * 计算完成百分比
   * TODO: 后期实现 - 根据已完成图纸数 / 总图纸数 计算
   * @returns {string} 完成百分比字符串
   */
  const getCompletionPercentage = () => {
    // TODO: 实现完成百分比计算逻辑
    return '0%';
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
      <InfoField label="Line No" value={jobData?.line_number} align="center" />
      <InfoField label="PO Number" value={jobData?.po_number} align="left" />
      <InfoField label="Part Number" value={jobData?.part_number} align="left" />
      <InfoField label="Rev No" value={jobData?.revision} align="center" />
      <InfoField label="Qty" value={jobData?.job_quantity} align="center" />
      <InfoField label="Required Date" value={jobData?.delivery_required_date} align="center" />
      <InfoField label="Completion" value={getCompletionPercentage()} align="center" />
    </Stack>
  );
}