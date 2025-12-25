import React from 'react';
import { Button, Box } from '@mui/material';

/**
 * 切换按钮组组件
 * 提供多选或单选的按钮组，点击后在 outlined 和 contained 之间切换
 * 
 * @component
 * @param {Object} value - 当前选中的值对象 { key1: true, key2: false, ... }
 * @param {Function} onChange - 值变化时的回调函数
 * @param {Array} options - 选项数组，格式: [{ value: string, label: string }, ...]
 * @param {number} [columns=3] - 网格列数
 * @param {object} [sx={}] - 自定义样式对象
 * @returns {JSX.Element} 切换按钮组
 */
export default function ToggleButtonGroup({
  value = {},
  onChange,
  options = [],
  columns = 3,
  sx = {}
}) {
  const handleToggle = (optionValue) => {
    const newValue = {
      ...value,
      [optionValue]: !value[optionValue],
    };
    onChange(newValue);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 1.5,
        ...sx,
      }}
    >
      {options.map((option) => {
        const isSelected = value[option.value] || false;
        return (
          <Button
            key={option.value}
            variant={isSelected ? 'contained' : 'outlined'}
            onClick={() => handleToggle(option.value)}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '16px',
              ...(isSelected && {
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }),
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </Box>
  );
}
