import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import Backdrop from '@mui/material/Backdrop';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import ConfirmJobCreationForm from './ConfirmJobForm';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 500,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflow: 'auto',
};

/**
 * 确认作业创建模态框
 * @param {boolean} open - 是否打开
 * @param {function} onConfirm - 确认回调
 * @param {function} onCancel - 取消回调
 * @param {object} jobData - 作业数据
 */
export default function ConfirmJobCreationModal({ open, onConfirm, onCancel, jobData }) {
  return (
    <Modal
      aria-labelledby="confirm-job-modal-title"
      open={open}
      onClose={onCancel}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={open}>
        <Box sx={style}>
          <Typography id="confirm-job-modal-title" variant="h1" sx={{ mb: 3 }}>
            Confirm Job Creation
          </Typography>

          <ConfirmJobCreationForm jobData={jobData} />

          <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={onConfirm}>
              Confirm
            </Button>
          </Stack>
        </Box>
      </Fade>
    </Modal>
  );
}