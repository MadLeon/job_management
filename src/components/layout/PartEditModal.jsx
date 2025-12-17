import React from 'react';
import GeneralModal from './Modal';
import PartEditForm from '../forms/PartEditForm';

/**
 * 部件编辑模态框
 * @param {boolean} open - 模态框是否打开
 * @param {function} onClose - 关闭模态框的回调函数
 * @param {object} partData - 部件数据（包括 drawing_number, revision, quantity, status, file_name, file_location）
 * @param {function} onSubmit - 提交表单的回调函数
 * @param {string} customTitle - 自定义标题（可选）
 * @param {string} partNumber - 部件号（用于创建新部件时）
 */
export default function PartEditModal({ open, onClose, partData = null, onSubmit, customTitle = null, partNumber = null }) {
  const handleSubmit = (formData) => {
    onSubmit(formData, partNumber);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const title = customTitle || (partData ? 'Edit Part Details' : 'Add Part Details');

  return (
    <GeneralModal
      open={open}
      onClose={onClose}
      title={title}
      sx={{ maxWidth: 800 }}
    >
      <PartEditForm
        partData={partData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </GeneralModal>
  );
}
