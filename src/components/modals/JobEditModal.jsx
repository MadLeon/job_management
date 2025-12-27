import React, { useEffect, useState } from 'react';
import { Box, Typography, Stack, FormControlLabel, Switch } from '@mui/material';
import Backdrop from '@mui/material/Backdrop';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import JobForm from '../forms/JobForm';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 800,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflow: 'auto',
};

/**
 * 工作编辑/创建模态框
 * @param {boolean} open - 模态框是否打开
 * @param {function} onClose - 关闭模态框的回调函数
 * @param {object} jobData - 工作数据
 * @param {function} onSubmit - 提交表单的回调函数
 * @param {boolean} isCreateMode - 是否为创建模式（可选）
 */
export default function JobEditModal({ open, onClose, jobData = null, onSubmit, isCreateMode = false }) {
  const [initialJobData, setInitialJobData] = useState(jobData);
  const [isLoading, setIsLoading] = useState(false);
  const [addMultiple, setAddMultiple] = useState(false);

  useEffect(() => {
    if (open && isCreateMode) {
      // 创建模式：获取下一个job number和oe number
      fetchNextNumbers();
    } else if (open && jobData) {
      // 编辑模式：使用传入的jobData
      setInitialJobData(jobData);
    }
  }, [open, isCreateMode, jobData]);

  const fetchNextNumbers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/jobs/next-numbers');
      if (response.ok) {
        const data = await response.json();
        setInitialJobData({
          job_number: data.nextJobNumber || '',
          oe_number: data.nextOENumber || '',
          priority: 'Normal',
          po_number: '',
          customer_name: '',
          customer_contact: '',
          line_number: '',
          part_number: '',
          part_description: '',
          revision: '',
          job_quantity: '',
          delivery_required_date: '',
          material_specification: '',
          drawing_notes: '',
          manufacturing_notes: '',
          file_location: '',
        });
      } else {
        console.error('Failed to fetch next numbers');
        setInitialJobData({
          job_number: '',
          oe_number: '',
          priority: 'Normal',
          po_number: '',
          customer_name: '',
          customer_contact: '',
          line_number: '',
          part_number: '',
          part_description: '',
          revision: '',
          job_quantity: '',
          delivery_required_date: '',
          material_specification: '',
          drawing_notes: '',
          manufacturing_notes: '',
          file_location: '',
        });
      }
    } catch (error) {
      console.error('Error fetching next numbers:', error);
      setInitialJobData({
        job_number: '',
        oe_number: '',
        priority: 'Normal',
        po_number: '',
        customer_name: '',
        customer_contact: '',
        line_number: '',
        part_number: '',
        part_description: '',
        revision: '',
        job_quantity: '',
        delivery_required_date: '',
        material_specification: '',
        drawing_notes: '',
        manufacturing_notes: '',
        file_location: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (formData) => {
    onSubmit(formData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const title = isCreateMode ? 'Create New Job' : (jobData ? 'Edit Job' : 'Create New Job');
  const shouldShowContent = !isCreateMode || (isCreateMode && !isLoading);

  return (
    <Modal
      aria-labelledby="job-modal-title"
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
      <Fade in={open && shouldShowContent}>
        <Box sx={style}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Typography id="job-modal-title" variant="h1">
              {title}
            </Typography>
            {isCreateMode && (
              <FormControlLabel
                control={
                  <Switch
                    checked={addMultiple}
                    onChange={(e) => setAddMultiple(e.target.checked)}
                  />
                }
                label="Add Multiple"
              />
            )}
          </Stack>

          {!isLoading && initialJobData && (
            <JobForm
              jobData={initialJobData}
              isCreateMode={isCreateMode}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}
        </Box>
      </Fade>
    </Modal>
  );
}
