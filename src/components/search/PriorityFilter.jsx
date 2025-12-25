import { ToggleButtonGroup } from "@/components/common";
import { priorityOptions } from "@/../data/data";

/**
 * 优先级过滤器组件
 * 使用切换按钮组显示优先级选项
 * 
 * @param {Object} value - 当前选中的优先级对象
 * @param {Function} onChange - 优先级变化时的回调函数
 */
export default function PriorityFilter({ value = {}, onChange }) {
  // 将 priorityOptions 转换为选项数组
  const options = Object.keys(priorityOptions).map((priority) => ({
    value: priority,
    label: priority,
  }));

  return (
    <ToggleButtonGroup
      value={value}
      onChange={onChange}
      options={options}
      columns={3}
    />
  );
}
