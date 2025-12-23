import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import EditIcon from '@mui/icons-material/Edit';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

/**
 * 按钮配置对象
 * 定义每个按钮的图标、颜色、标签等元数据
 * 
 * @type {Object<string, {icon: React.Component, color: string, label: string, ariaLabel: string}>}
 */
export const BUTTON_CONFIGS = {
  /**
   * PDF 打开按钮 - 打开文件或PDF
   */
  pdf: {
    icon: ImageOutlinedIcon,
    color: 'primary',
    label: 'Open PDF',
    ariaLabel: 'Open PDF button',
    fontSize: 20,
  },

  /**
   * 编辑按钮 - 编辑工作或装配体
   */
  edit: {
    icon: EditIcon,
    color: 'primary',
    label: 'Edit',
    ariaLabel: 'Edit button',
    fontSize: 20,
  },

  /**
   * 删除按钮 - 删除记录
   */
  delete: {
    icon: RemoveCircleOutlineOutlinedIcon,
    color: 'darkRed',
    label: 'Delete',
    ariaLabel: 'Delete button',
    fontSize: 20,
  },

  /**
   * 添加按钮 - 添加新的装配体或部件
   */
  add: {
    icon: AddCircleOutlineIcon,
    color: 'secondary',
    label: 'Add',
    ariaLabel: 'Add button',
    fontSize: 20,
  },

  /**
   * 打开新窗口/详情按钮 - 打开详情页面或新链接
   */
  openNew: {
    icon: OpenInNewIcon,
    color: 'primary',
    label: 'Open',
    ariaLabel: 'Open details button',
    fontSize: 20,
  },
};

/**
 * 获取按钮配置
 * @param {string} buttonKey - 按钮键名
 * @returns {Object} 按钮配置对象
 */
export function getButtonConfig(buttonKey) {
  return BUTTON_CONFIGS[buttonKey] || null;
}
