import * as React from 'react';
import Typography from '@mui/material/Typography';
import { Box, Stack } from '@mui/material';

export default function PageTitle({ title, children }) {
  return (
    <Stack direction={"row"} justifyContent="space-between" alignItems="center">
      <Typography variant="h1" component="h1">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}
