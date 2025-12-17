import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 600,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflow: 'auto',
};

/**
 * 通用模态框组件
 * @param {boolean} open - 模态框是否打开
 * @param {function} onClose - 关闭模态框的回调函数
 * @param {string} title - 模态框标题
 * @param {React.ReactNode} children - 模态框内容
 * @param {object} sx - 自定义样式（可选）
 */
export default function GeneralModal({
  open,
  onClose,
  title,
  children,
  sx = {}
}) {
  return (
    <Modal
      aria-labelledby="general-modal-title"
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={open}>
        <Box sx={{ ...style, ...sx }}>
          <Typography id="general-modal-title" variant="h1" sx={{ mb: 3 }}>
            {title}
          </Typography>
          {children}
        </Box>
      </Fade>
    </Modal>
  );
}