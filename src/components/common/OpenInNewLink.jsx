import React from 'react';
import { Stack, IconButton, Typography, Link } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

/**
 * 新窗口打开链接组件
 * 使用 Stack 分组一个文本和一个图标按钮，整个 Stack 作为链接
 * 
 * @component
 * @param {string} url - 链接的目标 URL
 * @param {string} [text='打开'] - 显示的链接文本
 * @param {string} [target='_blank'] - 链接打开方式（'_blank' 新窗口，'_self' 当前窗口）
 * @param {Object} [sx={}] - Stack 的自定义样式
 * @returns {JSX.Element} 打开新窗口的链接组件
 * 
 * @example
 * <OpenInNewLink url="https://example.com" text="查看文档" />
 * 
 * @example
 * <OpenInNewLink 
 *   url="/path/to/file" 
 *   text="下载文件"
 *   sx={{ gap: 1, cursor: 'pointer' }}
 * />
 */
export default function OpenInNewLink({ url = "#", text = 'Open', target = '_blank', sx = {} }) {
  /**
   * 处理链接点击
   */
  const handleClick = () => {
    if (url) {
      window.open(url, target);
    }
  };

  return (
    <Link
      href={url}
      target={target}
      rel="noopener noreferrer"
      underline="none"
      sx={{
        display: 'inline-block',
        ...sx,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
          ...sx,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          {text}
        </Typography>
        <OpenInNewIcon sx={{ fontSize: '18px' }} />
      </Stack>
    </Link>
  );
}
