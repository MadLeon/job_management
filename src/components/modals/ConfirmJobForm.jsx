import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

/**
 * 确认作业创建表单
 * @param {object} jobData - 作业数据
 */
export default function ConfirmJobCreationForm({ jobData, isChanged = [] }) {
  /**
   * 首字母大写工具函数
   * @param {string} str - 输入字符串
   * @returns {string} 首字母大写后的字符串
   */
  function capitalizeWords(str) {
    // 如果单词为 "oe" 或 "po"，则全部大写，否则首字母大写
    return str.replace(/\b\w+\b/g, word => {
      if (word.toLowerCase() === 'oe' || word.toLowerCase() === 'po') {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
  }

  const fieldOrder = [
    'job_number',
    'po_number',
    'oe_number',
    'customer_name',
    'customer_contact',
    'line_number',
    'part_number',
    'part_description',
    'revision',
    'job_quantity',
    'priority',
    'drawing_release',
    'delivery_required_date',
    'file_location',
    'unit_price',
  ];

  return (
    <Box>
      <Stack spacing={2}>
        {fieldOrder.map((key) => (
          <Stack direction="row" justifyContent="space-between" key={key}>
            <Typography variant="body">
              {capitalizeWords(key.replace(/_/g, ' '))}:
            </Typography>
            <Typography
              variant="body"
              noWrap={true}
              sx={{
                maxWidth: '250px',
                color: isChanged.includes(key) ? 'red' : 'inherit', // 高亮显示更改的字段
                fontWeight: isChanged.includes(key) ? 'bold' : 'normal',
              }}
            >
              {jobData[key] || 'N/A'}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}