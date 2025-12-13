import * as React from 'react';
import Typography from '@mui/material/Typography';
import { Box } from '@mui/material';

export default function ContainerTitle({ title }) {
  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Typography variant='h2'>
        {title}
      </Typography>
    </Box>
  );
}
