import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

/**
 * 删除确认对话框组件
 * @param {boolean} open - 对话框是否打开
 * @param {function} onClose - 关闭对话框的回调
 * @param {function} onConfirm - 确认删除的回调
 * @param {string} title - 对话框标题
 * @param {string} message - 对话框内容
 * @param {string} itemName - 要删除的项目名称（可选）
 */
export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item?",
  itemName = null
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <DialogTitle id="delete-dialog-title" component="div" sx={{ pt: 3 }}>
        <Typography variant="h2">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-dialog-description">
          {itemName ? `${message} (${itemName})` : message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="outlined"
          size="medium"
          sx={{
            '& .MuiButton-text': {
              fontWeight: 'bold'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          autoFocus
          variant="contained"
          size="medium"
          sx={{
            backgroundColor: 'error.main',
            '&:hover': {
              backgroundColor: 'error.dark'
            },
            '& .MuiButton-text': {
              fontWeight: 'bold'
            }
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

