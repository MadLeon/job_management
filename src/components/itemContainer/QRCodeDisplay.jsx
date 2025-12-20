import { Box, Paper } from '@mui/material';
import Image from 'next/image';

/**
 * 二维码展示组件
 * 显示工作订单的二维码，用于快速识别和追踪
 * 
 * @component
 * @param {number} [size=200] - 二维码的宽度和高度（像素）
 * @returns {JSX.Element} 二维码组件
 */
export default function QRCodeDisplay({ size = 200 }) {
  return (
    <Paper
      sx={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
      }}
    >
      <Image
        src="/qr_sample.png"
        alt="QR Code"
        width={size - 16}
        height={size - 16}
        priority
      />
    </Paper>
  );
}
