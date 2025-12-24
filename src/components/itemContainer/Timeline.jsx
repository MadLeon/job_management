import { IconButton, Tooltip, Stack, Typography, Box } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ScheduleIcon from "@mui/icons-material/Schedule";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import { dummyEvents } from "../../../data/data";
import { BadgeAvatars } from "../common";

/**
 * 状态配置映射表
 * 为每个任务状态定义对应的图标、颜色、标签和无障碍属性
 * 
 * @type {Object<string, {icon: React.Component, color: string, label: string, ariaLabel: string}>}
 */
const STATUS_CONFIG = {
  "completed": {
    icon: CheckCircleOutlineIcon,
    color: 'success',
    label: 'Completed',
    ariaLabel: 'Task completed',
  },
  'in-progress': {
    icon: AutorenewIcon,
    color: 'info',
    label: 'In Progress',
    ariaLabel: 'Task in progress',
  },
  "pending": {
    icon: ScheduleIcon,
    color: 'warning',
    label: 'Pending',
    ariaLabel: 'Task pending',
  },
  "hold": {
    icon: PauseCircleIcon,
    color: 'error',
    label: 'Hold',
    ariaLabel: 'Task on hold',
  },
};

export default function Timeline({
  tasks = [],
}) {
  return (
    <Stack spacing={2} sx={{ p: 3, width: "100%" }}>
      {dummyEvents.map((task, index) => (
        <TimelineCard task={task} key={index} />
      ))}
    </Stack>
  );
}

function TimelineCard({ task }) {
  return (
    <Stack
      sx={{
        display: 'grid',
        gridTemplateColumns: '3fr auto auto auto',
        gap: 2,
        alignItems: 'center',
      }}
    >
      <Typography variant="caption">{task.task_name}</Typography>
      <BadgeAvatars name={task.operator} />
      <Typography variant="caption" sx={{ px: 2 }}>{task.time}</Typography>
      <TimelineStatus status={task.status} />
    </Stack>
  );
}

/**
 * 任务状态指示器组件
 * 根据不同的任务状态显示对应的图标和颜色
 * 支持的状态: complete（完成）、in-progress（进行中）、pending（待处理）、hold（暂停）
 * 
 * @component
 * @param {string} [status='pending'] - 任务状态（complete|in-progress|pending|hold）
 * @returns {JSX.Element} 包含状态图标的 IconButton 组件，禁用点击（仅用于展示）
 */
function TimelineStatus({ status = 'pending' }) {
  // 标准化状态字符串，从配置映射中获取，默认显示 pending 状态
  const normalizedStatus = status?.toLowerCase() || 'pending';
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Tooltip title={config.label} placement="top">
      <IconButton
        aria-label={config.ariaLabel}
        color={config.color}
        disabled
        size="small"
        sx={{
          cursor: 'default',
          '&.Mui-disabled': {
            color: `${config.color}.main`,
          },
        }}
      >
        <Icon />
      </IconButton>
    </Tooltip>
  );
}