import * as React from 'react';
import Typography from '@mui/material/Typography';
import { Box } from '@mui/material';

export default function PageTitle({ title }) {
  return (
    <Box>
      <Typography variant="h1" component="h1" gutterBottom>
        {title}
      </Typography>
    </Box>
  );
}