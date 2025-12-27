import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  MenuItem,
  Grid,
  IconButton,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';

const statusOptions = ['N/A', 'Pending', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];

const extractFileName = (filePath) => {
  if (!filePath) return '';
  const fileName = filePath.split(/[\\\/]/).pop();
  return fileName || '';
};

function PartEditFormInner({ initialData, onSubmit, onCancel }) {
  const fileInputRef = React.useRef(null);

  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleDrawingNumberBlur = async () => {
    if (formData.drawing_number.trim() && !formData.file_location) {
      try {
        const queryParams = new URLSearchParams({
          drawingNumber: formData.drawing_number,
        });

        const response = await fetch(`/api/jobs/drawing-file-location?${queryParams}`);
        if (response.ok) {
          const data = await response.json();
          if (data.fileLocation) {
            setFormData((prev) => ({
              ...prev,
              file_location: data.fileLocation,
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching file location:', error);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.drawing_number.trim()) {
      newErrors.drawing_number = 'Drawing number is required';
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        file_location: file.path || file.name,
      }));
    }
  };

  const handleOpen = async () => {
    if (formData.file_location) {
      try {
        const response = await fetch(`/api/jobs/pdf?fileLocation=${encodeURIComponent(formData.file_location)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } else {
          console.error('Failed to fetch file');
        }
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Drawing Number"
            name="drawing_number"
            value={formData.drawing_number}
            onChange={handleChange}
            onBlur={handleDrawingNumberBlur}
            error={!!errors.drawing_number}
            helperText={errors.drawing_number}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Revision"
            name="revision"
            value={formData.revision}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            error={!!errors.quantity}
            helperText={errors.quantity}
            size="small"
            inputProps={{ min: 0, step: 1 }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            error={!!errors.status}
            helperText={errors.status}
            select
            size="small"
          >
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="File Name"
            name="file_name"
            value={extractFileName(formData.file_location)}
            onChange={handleChange}
            size="small"
            disabled
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Stack direction="row" spacing={0} sx={{ alignItems: 'flex-end', gap: 0 }}>
            <TextField
              fullWidth
              label="File Location"
              name="file_location"
              value={formData.file_location}
              onChange={handleChange}
              size="small"
              sx={{ pr: 1 }}
              placeholder="Paste full path or use Browse button"
            />
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileSelect}
            />
            <IconButton
              color="primary"
              onClick={handleBrowse}
              title="Browse file"
              size="medium"
            >
              <FolderOpenIcon />
            </IconButton>
            <IconButton
              color="primary"
              onClick={handleOpen}
              title="Open file"
              disabled={!formData.file_location}
              size="medium"
            >
              <VisibilityIcon />
            </IconButton>
          </Stack>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" type="submit">
          Save Changes
        </Button>
      </Stack>
    </Box>
  );
}

export default function PartEditForm({ partData = null, onSubmit, onCancel }) {
  const initialData = useMemo(() => ({
    drawing_number: partData?.drawing_number || '',
    revision: partData?.revision || '',
    quantity: partData?.quantity || '',
    status: partData?.status || 'N/A',
    file_name: partData?.file_name || '',
    file_location: partData?.file_location || '',
  }), [partData]);

  const formKey = useMemo(() => {
    return partData ? `${partData.drawing_number || ''}|${partData.revision || ''}` : 'new-part';
  }, [partData]);

  return (
    <PartEditFormInner
      key={formKey}
      initialData={initialData}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
