'use client';

import React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Typography } from '@mui/material';
import ContainerTitle from './ContainerTitle';

/**
 * 工作完成度图表组件 - 使用MUI X Pie Chart展示各个生产阶段的任务数量
 * 
 * @component
 * @returns {React.ReactElement} 包含标题和饼图的容器元素
 * @example
 * return (
 *   <JobCompletionChart />
 * )
 */
const JobCompletionChart = () => {
  // 定义各个生产阶段的数据
  const completionData = [
    { id: 0, value: 12, label: 'Manufacturing' },
    { id: 1, value: 8, label: 'Inspection' },
    { id: 2, value: 5, label: 'DIR' },
    { id: 3, value: 15, label: 'Complete' },
    { id: 4, value: 10, label: 'Pending' },
    { id: 5, value: 3, label: 'Rework' },
    { id: 6, value: 7, label: 'Ship Ready' },
  ];

  return (

    <PieChart
      series={[
        {
          data: completionData,
        },
      ]}
      width={200}
      height={200}
      slotProps={{
        legend: {
          sx: {
            paddingLeft: 4,
          },
        },
      }}
      sx={{ p: 3 }}
    />
  );
};

export default JobCompletionChart;
