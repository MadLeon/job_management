import { Stack, Typography, IconButton } from '@mui/material';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';

/**
 * 补充工作信息展示组件
 * 以列布局展示工作的补充信息字段
 * 
 * @component
 * @param {Object} jobData - 工作数据对象
 * @returns {JSX.Element} 补充工作信息列布局
 */
export default function AdditionalJobInfo({ jobData }) {
  /**
   * 信息行组件 - 显示标签和值的行布局
   * @param {string} label - 标签文本
   * @param {string|number} value - 值
   * @param {JSX.Element} [icon] - 可选的图标按钮
   * @returns {JSX.Element} 信息行
   */
  const InfoRow = ({ label, value, icon }) => (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        px: 3,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          {value || 'N/A'}
        </Typography>
        {icon}
      </Stack>
    </Stack>
  );

  return (
    <Stack
      direction="column"
      width="100%"
      spacing={2}
      py={3}
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
      }}
    >
      <InfoRow label="OE Number" value={jobData?.oe_number} />
      <InfoRow label="Customer" value={jobData?.customer_name} />
      <InfoRow
        label="Contact"
        value={jobData?.customer_contact}
        icon={
          <IconButton size="small" sx={{ ml: 1 }}>
            <MailOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        }
      />
      <InfoRow label="Working Time (This Job)" value="N/A" />
      <InfoRow label="Description" value={jobData?.part_description} />
    </Stack>
  );
}
