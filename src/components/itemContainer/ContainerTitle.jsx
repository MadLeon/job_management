import * as React from 'react';
import Typography from '@mui/material/Typography';
import { Box, Stack } from '@mui/material';

/**
 * 容器标题组件
 * 为容器提供统一的标题样式，支持在标题后添加可选的组件
 * 
 * @component
 * @param {string} title - 容器标题文本
 * @param {JSX.Element} [component] - 可选的组件，将在标题后以 space-between 布局显示
 * @returns {JSX.Element} 容器标题
 */
export default function ContainerTitle({ title, component }) {
  return (
    <Box sx={{ px: 3, py: 2 }}>
      {component ? (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant='h2'>
            {title}
          </Typography>
          {component}
        </Stack>
      ) : (
        <Typography variant='h2'>
          {title}
        </Typography>
      )}
    </Box>
  );
}
