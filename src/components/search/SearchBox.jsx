import React, { useState, useMemo, useCallback } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useJobSearch } from '@/lib/hooks/useJobSearch';

/**
 * 搜索框组件 - 支持按job_number, po_number, part_number, drawing_number(detail number)搜索
 * 使用MUI Autocomplete和React Query进行实时搜索
 * 
 * @param {Function} [onSelect] - 用户选择一条记录时的回调函数，接收选中的job记录
 * @param {number} [limit=20] - 返回搜索结果的最大数量
 * @param {string} [sx={}] - MUI sx prop用于样式自定义
 * 
 * @example
 * const handleSelect = (job) => {
 *   console.log('Selected job:', job);
 * };
 * <SearchBox onSelect={handleSelect} limit={20} />
 */
export default function SearchBox({ onSelect, limit = 20, sx = {} }) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);

  // 使用自定义hook获取搜索结果
  const { data: searchResults = [], isLoading, isFetching, isError, error } = useJobSearch(
    inputValue,
    limit,
    open // 仅在dropdown打开时执行搜索
  );

  // 格式化选项标签（用于搜索和文本显示）
  const formatOptionLabel = useCallback((job) => {
    const parts = [];

    if (job.job_number) {
      parts.push(`Job: ${job.job_number}`);
    }
    if (job.line_number) {
      parts.push(`Line: ${job.line_number}`);
    }
    if (job.po_number) {
      parts.push(`PO: ${job.po_number}`);
    }
    if (job.part_number) {
      parts.push(`Part: ${job.part_number}`);
    }

    return parts.join(' | ');
  }, []);

  // 格式化选项显示（返回JSX片段，支持自定义样式）
  const formatOptionDisplay = useCallback((job) => {
    const firstLineFields = [];
    
    if (job.job_number) {
      firstLineFields.push({ label: 'Job:', value: job.job_number });
    }
    if (job.line_number) {
      firstLineFields.push({ label: 'Line:', value: job.line_number });
    }
    
    return (
      <Box>
        {/* 第一行：Job（左）, Line（右） */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {job.line_number && (
            <Box>
              <Typography component="span" variant="body2" fontWeight="bold">
                Line:{' '}
              </Typography>
              <Typography component="span" variant="caption">
                {job.line_number}
              </Typography>
            </Box>
          )}
          {job.job_number && (
            <Box>
              <Typography component="span" variant="body2" fontWeight="bold">
                Job:{' '}
              </Typography>
              <Typography component="span" variant="caption">
                {job.job_number}
              </Typography>
            </Box>
          )}
        </Box>
        {/* 第二行：PO */}
        {job.po_number && (
          <Box>
            <Typography component="span" variant="body2" fontWeight="bold">
              PO:{' '}
            </Typography>
            <Typography component="span" variant="caption">
              {job.po_number}
            </Typography>
          </Box>
        )}
        {/* 第三行：Part */}
        {job.part_number && (
          <Box>
            <Typography component="span" variant="body2" fontWeight="bold">
              Part:{' '}
            </Typography>
            <Typography component="span" variant="caption">
              {job.part_number}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, []);

  // 创建选项数组，添加格式化标签
  const options = useMemo(() => {
    return searchResults.map((job) => ({
      ...job,
      label: formatOptionLabel(job),
    }));
  }, [searchResults, formatOptionLabel]);

  // 处理选项选择
  const handleOptionSelect = useCallback((event, value) => {
    if (value) {
      // 设置选中的值
      setSelectedValue(value);
      
      // 调用父组件回调
      if (onSelect) {
        onSelect(value);
      }
      // 关闭下拉列表，但不清空 inputValue（让 Autocomplete 自动显示选中项的 label）
      setOpen(false);
    } else {
      // 清除选中的值
      setSelectedValue(null);
      if (onSelect) {
        onSelect(null);
      }
    }
  }, [onSelect]);

  // 处理输入值变化，使用reason参数判断是否是用户主动清空
  const handleInputChange = useCallback((event, newInputValue, reason) => {
    // 当原因是 'blur' 或 'reset' 时，不更新 inputValue，保持当前搜索状态
    // 这些事件会在失去焦点时被触发，但我们希望保持搜索结果可见
    if (reason === 'blur' || reason === 'reset') {
      return;
    }
    
    // 只有在用户真正输入时才清除选中的值
    if (reason === 'input') {
      setSelectedValue(null);
    }
    
    setInputValue(newInputValue);

    // 仅当用户主动清空输入框时（reason为'clear'）才清除过滤
    if (reason === 'clear') {
      setSelectedValue(null);
      if (onSelect) {
        onSelect(null);
      }
    }
  }, [onSelect, inputValue]);

  // 处理下拉列表关闭，只在特定情况下关闭
  const handleClose = useCallback((event, reason) => {
    // 只有在以下情况下才关闭下拉列表：
    // - 'toggleInput': 用户点击下拉按钮
    // - 'escape': 用户按ESC键
    // 不响应 'blur'（点击外部区域）和 'selectOption'（已在 handleOptionSelect 中处理）
    if (reason === 'toggleInput' || reason === 'escape') {
      setOpen(false);
      // 关闭时清空搜索状态
      setInputValue('');
      setSelectedValue(null);
    }
  }, []);

  return (
    <Autocomplete
      disablePortal
      size="small"
      open={open}
      onOpen={() => setOpen(true)}
      value={selectedValue}
      onClose={handleClose}
      options={options}
      getOptionLabel={(option) => option.label || ''}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleOptionSelect}
      isOptionEqualToValue={(option, value) => option.unique_key === value.unique_key}
      loading={isLoading || isFetching}
      filterOptions={(x) => x}
      noOptionsText={
        isError ? (
          <Typography color="error" variant="body2">
            Error Occured During Searching. {error?.message || 'Unknown error'}
          </Typography>
        ) : inputValue.trim() === '' ? (
          'Enter search keywords'
        ) : (
          'No matching records found'
        )
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search"
          placeholder="Job / PO / Part / Drawing"
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {(isLoading || isFetching) && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.unique_key}>
          <Box sx={{ width: '100%' }}>
            {formatOptionDisplay(option)}
          </Box>
        </Box>
      )}
      sx={{ width: 400, ...sx }}
    />
  );
}
