import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  MenuItem,
  Grid,
  IconButton,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { priorityOptions } from '../../../data/data';

const CUSTOMER_OPTIONS = ['Candu', 'Kinectrics', 'ATI'];

const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';

  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  // Try to parse and format the date
  const date = new Date(dateValue);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
};

export default function JobForm({ jobData = null, isCreateMode = false, onSubmit, onCancel }) {
  const validPriorities = Object.keys(priorityOptions);
  const fileInputRef = React.useRef(null);

  const [formData, setFormData] = useState({
    job_number: '',
    po_number: '',
    oe_number: '',
    customer_name: '',
    customer_contact: '',
    line_number: '',
    part_number: '',
    part_description: '',
    revision: '',
    job_quantity: '',
    delivery_required_date: '',
    priority: 'Normal',
    file_location: '',
    drawing_release: '',
    unit_price: '',
  });

  useEffect(() => {
    if (jobData) {
      const priority = jobData.priority && validPriorities.includes(jobData.priority)
        ? jobData.priority
        : 'Normal';

      const formattedData = {
        ...jobData,
        priority,
        delivery_required_date: formatDateForInput(jobData.delivery_required_date),
      };

      setFormData(formattedData);
      console.log('JobForm - formatted jobData:', formattedData);
    }
  }, [jobData]);

  useEffect(() => {
    console.log('JobForm - formData:', formData);
    console.log('JobForm - delivery_required_date:', formData.delivery_required_date);
    console.log('JobForm - file_location:', formData.file_location);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handlePreviewClick = async () => {
    const fileLocation = formData.file_location;
    if (fileLocation && fileLocation.trim() !== '') {
      try {
        const response = await fetch(`/api/jobs/pdf?fileLocation=${encodeURIComponent(fileLocation)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Clean up the object URL after loading
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } else {
          console.error('Failed to fetch file for preview');
        }
      } catch (error) {
        console.error('Error opening file preview:', error);
      }
    } else {
      console.log('File location is empty');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name;
      // In browsers, we can only get the filename due to security restrictions
      // webkitRelativePath only works with directory input
      const fileLocation = `${fileName}`;

      setFormData(prev => ({
        ...prev,
        file_location: fileLocation,
      }));

      console.log('File selected:', {
        fileName,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified,
        fileLocation,
      });
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const extractFileName = (filePath) => {
    if (!filePath) return '';
    // Extract the part after the last backslash or forward slash
    const fileName = filePath.split(/[\\\/]/).pop();
    return fileName || '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEditMode = jobData !== null && !isCreateMode;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Job Number"
            name="job_number"
            value={formData.job_number}
            onChange={handleChange}
            disabled={isEditMode}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="PO Number"
            name="po_number"
            value={formData.po_number}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="OE Number"
            name="oe_number"
            value={formData.oe_number}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Customer Name"
            name="customer_name"
            value={formData.customer_name}
            onChange={handleChange}
            select
            size="small"
          >
            {CUSTOMER_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Customer Contact"
            name="customer_contact"
            value={formData.customer_contact}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Line Number"
            name="line_number"
            value={formData.line_number}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Part Number"
            name="part_number"
            value={formData.part_number}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Part Description"
            name="part_description"
            value={formData.part_description}
            onChange={handleChange}
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
            label="Drawing Release"
            name="drawing_release"
            value={formData.drawing_release}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Job Quantity"
            name="job_quantity"
            type="number"
            value={formData.job_quantity}
            onChange={handleChange}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Delivery Required Date"
            name="delivery_required_date"
            type="date"
            value={formData.delivery_required_date}
            onChange={handleChange}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            select
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            size="small"
          >
            {validPriorities.map((priority) => (
              <MenuItem key={priority} value={priority}>
                {priority}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Unit Price"
            name="unit_price"
            type="number"
            value={formData.unit_price}
            onChange={handleChange}
            size="small"
          />
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
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <IconButton size="medium" onClick={handleBrowseClick} title="Browse and select a file">
              <FolderOpenIcon fontSize="medium" />
            </IconButton>
            <IconButton size="medium" onClick={handlePreviewClick} title="Preview file">
              <VisibilityIcon fontSize="medium" />
            </IconButton>
          </Stack>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" type="submit">
          {isEditMode ? 'Save' : 'Create'}
        </Button>
      </Stack>
    </Box>
  );
}
