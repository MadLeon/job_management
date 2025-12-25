import React, { useState, useMemo, useCallback } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useJobSearch } from '@/lib/hooks/useJobSearch';

/**
 * 搜索框组件 - 支持按job_number, po_number, part_number, drawing_number搜索
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

  // 使用自定义hook获取搜索结果
  const { data: searchResults = [], isLoading, isFetching, isError, error } = useJobSearch(
    inputValue,
    limit,
    open // 仅在dropdown打开时执行搜索
  );

  // 调试：监听搜索结果变化
  // React.useEffect(() => {
  //   if (inputValue) {
  //     console.log('[SearchBox] 搜索关键词:', inputValue);
  //     console.log('[SearchBox] 搜索结果数量:', searchResults.length);
  //     if (searchResults.length > 0) {
  //       console.log('[SearchBox] 搜索结果样本:', searchResults[0]);
  //     }
  //   }
  // }, [inputValue, searchResults]);

  // // 调试：监听错误
  // React.useEffect(() => {
  //   if (isError) {
  //     console.error('[SearchBox] 搜索错误:', error);
  //   }
  // }, [isError, error]);

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
      console.log('[SearchBox] 用户选择了:', {
        job_number: value.job_number,
        line_number: value.line_number,
        po_number: value.po_number,
        part_number: value.part_number,
        unique_key: value.unique_key,
      });
      // 调用父组件回调
      if (onSelect) {
        onSelect(value);
      }
      // 清空输入框
      setInputValue('');
      setOpen(false);
    }
  }, [onSelect]);

  // 处理输入值变化，使用reason参数判断是否是用户主动清空
  const handleInputChange = useCallback((event, newInputValue, reason) => {
    setInputValue(newInputValue);

    // 仅当用户主动清空输入框时（reason为'clear'）才清除过滤
    if (reason === 'clear' && onSelect) {
      console.log('[SearchBox] 用户清空了输入框，清除搜索过滤');
      onSelect(null);
    }
  }, [onSelect]);

  return (
    <Autocomplete
      disablePortal
      size="small"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      getOptionLabel={(option) => option.label || ''}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleOptionSelect}
      isOptionEqualToValue={(option, value) => option.unique_key === value.unique_key}
      loading={isLoading || isFetching}
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
