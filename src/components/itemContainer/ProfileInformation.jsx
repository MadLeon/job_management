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
export default function ProfileInformation({ jobData, data = null, type = 'job' }) {
  /**
   * 根据类型渲染不同的列字段
   */
  const renderTypeSpecificFields = () => {
    switch (type) {
      case 'assembly':
        return (
          <>
          </>
        );
      case 'detail':
        return (
          <>
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
      <InfoField label="Drawing Number" value={data?.drawing_number} align="left" />
      <InfoField label="Rev No" value={data?.revision} align="center" />
      <InfoField label="Customer" value={data?.customer} align="center" />
      <InfoField label="Average Time" value={data?.average_time} align="center" />
      <InfoField label="Production Count" value={data?.production_count} align="center" />
      <InfoField label="Description" value={data?.description} align="center" />
      {renderTypeSpecificFields()}
    </Stack>
  );
}