import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function TaskScheduler() {
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
        This is the Task Scheduler Page.
      </Typography>
    </Box>
  );
}

export default TaskScheduler;