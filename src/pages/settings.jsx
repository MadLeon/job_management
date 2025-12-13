import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function Settings() {
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
        This is the Settings Page.
      </Typography>
    </Box>
  );
}

export default Settings;