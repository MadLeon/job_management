// src/design.js
import React from 'react';
import { Box } from '@mui/material';
import Divider from '@mui/material/Divider';

const Design = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#eeeeee',
      }}
    >
      {/* Top Toolbar */}
      <Box
        sx={{
          height: '60px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'white',
        }}
      >
        <Box sx={{ width: '200px'}} />
        <Divider orientation="vertical" flexItem />
      </Box>

      <Divider orientation='horizontal' flexItem />

      {/* Main Content Area */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Left Nav Panel */}
        <Box
          sx={{
            width: '200px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
          }}
        >
        </Box>

        <Divider orientation='vertical' flexItem />

        {/* Main Content */}
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        </Box>
      </Box>
    </Box>
  );
};

export default Design;