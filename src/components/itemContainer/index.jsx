import { Box, Divider, Stack } from '@mui/material';

import ContainerTitle from './ContainerTitle';

/**
 * 项目容器组件
 * 提供统一的容器布局和样式，包含可选的标题
 * 
 * @component
 * @param {string} [title] - 容器标题（可选）
 * @param {JSX.Element} content - 容器内容
 * @param {JSX.Element} [component] - 可选的标题右侧组件
 * @param {Object} [sx] - 自定义样式对象
 * @returns {JSX.Element} 项目容器
 */
export default function ItemContainer({ title, content, component, width = '100%', sx = {} }) {
  return (
    <Stack width={width} sx={{ backgroundColor: '#FFFFFF', borderRadius: '10px', ...sx }}>
      {title ? (
        <Box>
          <ContainerTitle title={title} component={component} />
          <Divider />
        </Box>
      ) : null}

      <Stack direction="row" sx={{ flex: 1, alignItems: 'center' }}>
        {content}
      </Stack>
    </Stack >
  );
}
