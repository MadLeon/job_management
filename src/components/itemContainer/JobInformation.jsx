import React from 'react';
import { Stack } from '@mui/material';
import InfoField from './InfoField';

/**
 * 工作信息展示组件
 * 以行布局展示工作的关键信息字段
 * 根据类型显示不同的字段内容
 * 
 * @component
 * @param {Object} jobData - 工作数据对象
 * @param {Object} [assemblyData=null] - 装配或图纸数据对象（当 type 为 'assembly' 或 'detail' 时使用）
 * @param {string} [type='job'] - 显示类型 ('job'|'assembly'|'detail')
 *   - 'job': 显示 jobData，显示 PO Number 和 Completion
 *   - 'assembly': 显示 assemblyData，显示 Description 和 Completion
 *   - 'detail': 显示 assemblyData，显示 Description 和 Status
 * @returns {JSX.Element} 工作信息行布局
 */
export default function JobInformation({ jobData, assemblyData = null, type = 'job' }) {
  /**
   * 计算完成百分比
   * TODO: 后期实现 - 根据已完成图纸数 / 总图纸数 计算
   * @returns {string} 完成百分比字符串
   */
  const getCompletionPercentage = () => {
    // TODO: 实现完成百分比计算逻辑
    return '0%';
  };

  /**
   * 根据类型渲染不同的列字段
   */
  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'assembly':
        return (
          <>
            <InfoField label="Description" value={assemblyData?.description} align="left" />
            <InfoField label="Completion" value={getCompletionPercentage()} align="center" />
          </>
        );
      case 'detail':
        return (
          <>
            <InfoField label="Description" value={assemblyData?.description} align="left" />
            <InfoField label="Status" value={assemblyData?.status} align="center" />
          </>
        );
      case 'job':
      default:
        return (
          <>
            <InfoField label="PO Number" value={jobData?.po_number} align="left" />
            <InfoField label="Completion" value={getCompletionPercentage()} align="center" />
          </>
        );
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
      <InfoField label="Line No" value={jobData?.line_number} align="center" />
      {type === 'job' ? (
        <InfoField label="Part Number" value={jobData?.part_number} align="left" />
      ) : (
        <InfoField label="Drawing Number" value={assemblyData?.drawing_number} align="left" />
      )}
      <InfoField label="Rev No" value={jobData?.revision} align="center" />
      <InfoField label="Qty" value={jobData?.job_quantity} align="center" />
      <InfoField label="Required Date" value={jobData?.delivery_required_date} align="center" />
      {renderTypeSpecificFields()}
    </Stack>
  );
}