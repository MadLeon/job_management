import React, { useEffect, useState } from 'react';
import GeneralModal from './Modal';
import JobForm from './JobForm';

/**
 * 创建工作模态框
 * @param {boolean} open - 模态框是否打开
 * @param {function} onClose - 关闭模态框的回调函数
 * @param {function} onSubmit - 提交表单的回调函数
 */
export default function CreateJobModal({ open, onClose, onSubmit }) {
  const [initialJobData, setInitialJobData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNextNumbers();
    }
  }, [open]);

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
          drawing_release: '',
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
          drawing_release: '',
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
        drawing_release: '',
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

  return (
    <GeneralModal
      open={open}
      onClose={onClose}
      title="Create New Job"
      sx={{ maxWidth: 800 }}
    >
      {!isLoading && initialJobData && (
        <JobForm
          jobData={initialJobData}
          isCreateMode={true}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </GeneralModal>
  );
}
