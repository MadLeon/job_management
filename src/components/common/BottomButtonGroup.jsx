import * as React from 'react';
import Button from '@mui/material/Button';
import { Stack } from '@mui/material';

/**
 * 删除确认对话框组件
 * @param {boolean} open - 对话框是否打开
 * @param {function} onClose - 关闭对话框的回调
 * @param {function} onConfirm - 确认删除的回调
 * @param {string} title - 对话框标题
 * @param {string} message - 对话框内容
 * @param {string} itemName - 要删除的项目名称（可选）
 */
export default function BottomButtonGroup({
  onClear,
  onClose,
  onApply,
}) {
  return (
    <Stack direction="row" spacing={2} justifyContent="space-between">
      <Button
        onClick={onClear}
        variant="text"
        size="large"
        sx={{
          color: "error.main",
          '& .MuiButton-text': {
            fontWeight: 700
          }
        }}
      >
        Clear All
      </Button>
      <Stack direction="row" spacing={2}>
        <Button
          onClick={onClose}
          variant="text"
          size="large"
          sx={{
            color: 'text.secondary',
            '& .MuiButton-text': {
              fontWeight: 700
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onApply}
          autoFocus
          variant="text"
          size="large"
          sx={{
            color: 'primary.main',
            '& .MuiButton-text': {
              fontWeight: 700
            }
          }}
        >
          Apply
        </Button>
      </Stack>
    </Stack>
  );
}

