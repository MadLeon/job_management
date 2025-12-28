/**
 * SnackbarContext
 * 全局唯一 Snackbar 管理 Context，提供 showSnackbar 方法
 * @module SnackbarContext
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * SnackbarContext 提供 showSnackbar 方法
 * @typedef {Object} SnackbarContextValue
 * @property {function({message: string, duration?: number}): void} showSnackbar - 显示 snackbar
 */
const SnackbarContext = createContext({ showSnackbar: () => {} });

/**
 * useSnackbar - 获取 snackbar context
 * @returns {SnackbarContextValue}
 */
export function useSnackbar() {
  return useContext(SnackbarContext);
}

/**
 * SnackbarProvider - 全局 Provider，包裹应用
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function SnackbarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(3000);

  /**
   * 显示 snackbar
   * @param {object} options
   * @param {string} options.message - 显示内容
   * @param {number} [options.duration=3000] - 显示时长
   */
  const showSnackbar = useCallback(({ message, duration = 3000 }) => {
    setMessage(message);
    setDuration(duration);
    setOpen(true);
  }, []);

  /**
   * 关闭 snackbar
   */
  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={message}
        action={
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </SnackbarContext.Provider>
  );
}
