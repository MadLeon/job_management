import { Stack, Typography } from '@mui/material';

/**
 * 工作信息字段组件
 * 显示单个信息字段，包括灰色标题和值
 * 
 * @component
 * @param {string} label - 字段标签（如"PO Number"）
 * @param {string|number} value - 字段值
 * @param {string} [align='center'] - 值的对齐方式（'left'|'center'）
 * @returns {JSX.Element} 信息字段
 */
export default function InfoField({ label, value, align = 'center' }) {
  return (
    <Stack spacing={1} sx={{ alignItems: align === 'left' ? 'flex-start' : 'center' }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h3"
      >
        {value || '-'}
      </Typography>
    </Stack>
  );
}
