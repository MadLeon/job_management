import React from 'react';
import { Stack, IconButton, useTheme } from '@mui/material';
import { BUTTON_CONFIGS } from './actionButtonConfig';

/**
 * 操作按钮列表组件（重构版本）
 * 
 * 配置驱动的按钮列表，可以灵活组合任意按钮
 * 通过 buttons 数组指定需要的按钮，通过 handlers 对象提供回调函数
 * 
 * @component
 * @param {Array<string>} [buttons=[]] - 要显示的按钮列表
 *   可选值: 'pdf', 'edit', 'delete', 'add', 'openNew'
 * @param {Object} [handlers={}] - 按钮事件处理器对象
 *   - handlers.onPdfClick - PDF 按钮点击事件
 *   - handlers.onEditClick - 编辑按钮点击事件
 *   - handlers.onDeleteClick - 删除按钮点击事件
 *   - handlers.onAddClick - 添加按钮点击事件
 *   - handlers.onOpenNewClick - 打开新窗口按钮点击事件
 * @param {Object} [disabledButtons={}] - 禁用的按钮状态对象
 *   - disabledButtons.pdf - PDF 按钮是否禁用
 *   - disabledButtons.edit - 编辑按钮是否禁用
 *   - disabledButtons.delete - 删除按钮是否禁用
 *   - disabledButtons.add - 添加按钮是否禁用
 *   - disabledButtons.openNew - 打开新窗口按钮是否禁用
 * @param {string} [align='left'] - 按钮对齐方式 ('left'|'center'|'right')
 * @returns {JSX.Element} 操作按钮列表
 * 
 * @example
 * // 基础使用
 * <ActionButtonList 
 *   buttons={['pdf', 'edit', 'delete']}
 *   handlers={{
 *     onPdfClick: () => console.log('open pdf'),
 *     onEditClick: () => setEditOpen(true),
 *     onDeleteClick: () => handleDelete(),
 *   }}
 * />
 * 
 * @example
 * // 带禁用状态
 * <ActionButtonList 
 *   buttons={['pdf', 'edit']}
 *   handlers={{
 *     onPdfClick: () => openPDF(),
 *     onEditClick: () => setEditOpen(true),
 *   }}
 *   disabledButtons={{ pdf: !fileLocation }}
 *   align="right"
 * />
 */
export default function ActionButtonList({
  buttons = [],
  handlers = {},
  disabledButtons = {},
  align = 'left',
}) {
  const theme = useTheme();

  /**
   * 获取按钮的颜色值
   * @param {string} colorKey - 颜色键名
   * @returns {string} 颜色值
   */
  const getColorValue = (colorKey) => {
    if (colorKey === 'darkRed') {
      return theme.palette.darkRed?.main || '#d32f2f';
    }
    if (colorKey === 'secondary') {
      return theme.palette.secondary?.main || '#1976d2';
    }
    return theme.palette.primary?.main || '#1976d2';
  };

  /**
   * 处理器映射表
   */
  const handlersMap = {
    pdf: handlers.onPdfClick,
    edit: handlers.onEditClick,
    delete: handlers.onDeleteClick,
    add: handlers.onAddClick,
    openNew: handlers.onOpenNewClick,
  };

  /**
   * 渲染单个按钮
   * @param {string} buttonKey - 按钮键名
   * @returns {JSX.Element|null} 按钮组件或 null
   */
  const renderButton = (buttonKey) => {
    const config = BUTTON_CONFIGS[buttonKey];
    const handler = handlersMap[buttonKey];
    const isDisabled = disabledButtons[buttonKey] || false;

    if (!config) {
      console.warn(`Button config not found for: ${buttonKey}`);
      return null;
    }

    const IconComponent = config.icon;

    return (
      <IconButton
        key={buttonKey}
        size="small"
        aria-label={config.ariaLabel}
        onClick={handler}
        disabled={isDisabled}
        sx={{
          p: 0.5,
        }}
      >
        <IconComponent
          sx={{
            fontSize: config.fontSize,
            color: isDisabled ? 'grey' : getColorValue(config.color),
          }}
        />
      </IconButton>
    );
  };

  return (
    <Stack
      direction="row"
      spacing={0}
      padding="0"
      sx={{
        justifyContent:
          align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
      }}
    >
      {buttons.map((buttonKey) => renderButton(buttonKey))}
    </Stack>
  );
}
