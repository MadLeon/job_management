import * as React from 'react';
import { Stack, useTheme } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import JobEditModal from '../layout/JobEditModal';
import PartEditModal from '../layout/PartEditModal';
import DeleteConfirmDialog from '../common/DeleteConfirmDialog';

export default function ActionButtonList({
  type = "assembly",
  fileLocation = null,
  jobData = null,
  partData = null,
  onJobSubmit = null,
  onPartSubmit = null
}) {
  const theme = useTheme();
  const location = fileLocation ?? "#";
  const [jobModalOpen, setJobModalOpen] = React.useState(false);
  const [partModalOpen, setPartModalOpen] = React.useState(false);
  const [createPartModalOpen, setCreatePartModalOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleOpenPDF = async () => {
    if (location && location !== "#") {
      try {
        const response = await fetch(`/api/jobs/pdf?fileLocation=${encodeURIComponent(location)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          // 清理对象 URL（在文件加载后）
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } else {
          console.error('Failed to fetch PDF');
        }
      } catch (error) {
        console.error('Error opening PDF:', error);
      }
    }
  };

  const handleEditClick = () => {
    if (type === 'detail') {
      // 部件编辑
      setPartModalOpen(true);
    } else {
      // 工作编辑
      setJobModalOpen(true);
    }
  };

  const handleJobModalSubmit = async (formData) => {
    // 如果jobData中有job_id，说明是编辑现有记录
    if (jobData && jobData.job_id) {
      try {
        const response = await fetch('/api/jobs/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_id: jobData.job_id,
            ...formData,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update job');
        }

        const result = await response.json();
        console.log('Job updated successfully:', result);

        if (onJobSubmit) {
          onJobSubmit(formData);
        }
      } catch (error) {
        console.error('Error updating job:', error);
      }
    } else {
      // 创建新job的逻辑
      if (onJobSubmit) {
        onJobSubmit(formData);
      } else {
        console.log("Job form submitted:", formData);
      }
    }
  };

  const handlePartModalSubmit = async (formData, partNumber) => {
    // 如果partData中有id，说明是编辑现有记录
    if (partData && partData.id) {
      try {
        const response = await fetch('/api/jobs/assembly-detail-update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: partData.id,
            drawing_number: formData.drawing_number,
            quantity: formData.quantity,
            status: formData.status,
            file_location: formData.file_location,
            revision: formData.revision,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update assembly detail');
        }

        const result = await response.json();
        console.log('Assembly detail updated successfully:', result);

        if (onPartSubmit) {
          onPartSubmit(formData);
        }
      } catch (error) {
        console.error('Error updating assembly detail:', error);
      }
    } else if (partNumber) {
      // 创建新的assembly detail记录
      try {
        const response = await fetch('/api/jobs/assembly-detail-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            part_number: partNumber,
            drawing_number: formData.drawing_number,
            quantity: formData.quantity,
            status: formData.status,
            file_location: formData.file_location,
            delivery_required_date: formData.delivery_required_date,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create assembly detail');
        }

        const result = await response.json();
        console.log('Assembly detail created successfully:', result);

        if (onPartSubmit) {
          onPartSubmit(formData);
        }
      } catch (error) {
        console.error('Error creating assembly detail:', error);
      }
    } else {
      // 备用逻辑
      if (onPartSubmit) {
        onPartSubmit(formData);
      } else {
        console.log("Part form submitted:", formData);
      }
    }
  };

  const handleAddPartClick = () => {
    setCreatePartModalOpen(true);
  };

  const handleDeleteClick = async () => {
    // 仅对detail类型（assembly detail）的删除
    if (type === 'detail' && partData && partData.id) {
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`/api/jobs/assembly-detail-delete?id=${partData.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete assembly detail');
      }

      const result = await response.json();
      console.log('Assembly detail deleted successfully:', result);

      if (onPartSubmit) {
        onPartSubmit({ deleted: true });
      }
    } catch (error) {
      console.error('Error deleting assembly detail:', error);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={0} padding="0">
        <IconButton
          size="small"
          aria-label={"Open PDF button"}
          onClick={handleOpenPDF}
          disabled={location === "#"}
        >
          <ImageOutlinedIcon color={location === "#" ? "grey" : "primary"} sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={"EditIcon button"}
          onClick={handleEditClick}
        >
          <EditIcon color="primary" sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={"Remove button"}
          onClick={handleDeleteClick}
        >
          <RemoveCircleOutlineOutlinedIcon sx={{ fontSize: 20, color: theme.palette.darkRed.main }} />
        </IconButton>
        {type === "assembly" && (
          <>
            <IconButton
              size="small"
              aria-label={"Add Part button"}
              onClick={handleAddPartClick}
            >
              <AddCircleOutlineIcon color="secondary" sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label={"EditIcon button"}
              onClick={() => console.log("EditIcon button clicked")}
            >
              <OpenInNewIcon color="primary" sx={{ fontSize: 20 }} />
            </IconButton>
          </>
        )}
      </Stack>

      {/* Job Edit Modal - For job level editing */}
      {type !== 'detail' && (
        <JobEditModal
          open={jobModalOpen}
          onClose={() => setJobModalOpen(false)}
          jobData={jobData}
          onSubmit={handleJobModalSubmit}
        />
      )}

      {/* Part Edit Modal - For assembly detail items */}
      {type === 'detail' && (
        <PartEditModal
          open={partModalOpen}
          onClose={() => setPartModalOpen(false)}
          partData={partData}
          onSubmit={handlePartModalSubmit}
        />
      )}

      {/* Create Part Modal - For adding new assembly details */}
      {type === 'assembly' && (
        <PartEditModal
          open={createPartModalOpen}
          onClose={() => setCreatePartModalOpen(false)}
          partData={null}
          onSubmit={handlePartModalSubmit}
          customTitle="Create Part Detail"
          partNumber={jobData?.part_number}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Assembly Detail"
        message="Are you sure you want to delete this assembly detail? This action cannot be undone."
        itemName={partData?.drawing_number}
      />
    </>
  );
}