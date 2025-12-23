import { Stack, Typography, IconButton } from '@mui/material';
import { ActionButtonList } from '../common';

export default function DrawingDocumentation({ jobData }) {
  /**
   * 信息行组件 - 显示标签和值的行布局
   * @param {string} label - 标签文本
   * @param {string|number} value - 值
   * @param {JSX.Element} [icon] - 可选的图标按钮
   * @returns {JSX.Element} 信息行
   */
  const InfoRow = ({ label, value }) => (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        px: 3,
        display: 'grid',
        gridTemplateColumns: '2fr 1.5fr 1fr',
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
      <ActionButtonList
        buttons={['openNew', 'delete']}
        handlers={{}}
        align="right"
      />
    </Stack>
  );

  return (
    <Stack
      direction="column"
      width="100%"
      spacing={2}
      py={3}
      sx={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
      }}
    >
      <InfoRow label="Manufacturing Process" value="Nov. 25, 2025" />
      <InfoRow label="MTR" value="Nov. 25, 2025" />
      <InfoRow label="DIR" value="N/A" />
    </Stack>
  );
}
