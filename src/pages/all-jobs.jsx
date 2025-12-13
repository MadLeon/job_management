import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function AllJobs() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        This is the All Jobs Page.
      </Typography>
    </Box>
  );
}

export default AllJobs;