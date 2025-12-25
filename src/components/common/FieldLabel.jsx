import React from 'react';
import { Stack, Typography } from '@mui/material';

/**
 * 表单字段标签组件
 * 用于显示字段标题和对应的UI控件
 * 
 * @component
 * @param {string} label - 字段标签文本
 * @param {React.ReactNode} children - 字段的UI控件（输入框、选择器等）
 * @param {boolean} [required=false] - 是否为必填字段
 * @param {object} [sx={}] - 自定义样式对象
 * @returns {JSX.Element} 字段标签组件
 */
export default function FieldLabel({ label, children, required = false, sx = {} }) {
  return (
    <Stack spacing={1} sx={{ width: '100%', ...sx }}>
      <Typography
        variant="body1"
        sx={{
          fontWeight: 500,
          fontSize: '17px',
          color: 'text.primary',
        }}
      >
        {label}
        {required && (
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>
            *
          </Typography>
        )}
      </Typography>
      {children}
    </Stack>
  );
}
