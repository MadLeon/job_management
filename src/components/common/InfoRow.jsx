import React from 'react';
import { Stack } from '@mui/material';

/**
 * 通用信息行组件
 * @param {object} props - 组件属性
 * @param {string} props.gridTemplateColumns - 定义网格列布局的模板字符串
 * @param {React.ReactNode[]} props.children - 子组件
 * @returns {JSX.Element} 信息行组件
 */
export default function InfoRow({ gridTemplateColumns, children }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        display: 'grid',
        gridTemplateColumns: gridTemplateColumns,
        gap: 2,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <div
          style={{
            textAlign: index === children.length - 1 ? 'right' : 'left',
          }}
        >
          {child}
        </div>
      ))}
    </Stack>
  );
}