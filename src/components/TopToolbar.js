// src/components/TopToolbar.js
import React from 'react';
import { Box, Divider } from '@mui/material';
import Typography from '@mui/material/Typography';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { useTheme } from '@mui/material/styles';

const TopToolbar = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: '60px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
      }}
    >
      <Box sx={{ width: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1}}>
          <img src="/logo.png" alt="Logo" style={{ height: '30px' }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Roboto',
              fontWeight: 'bold',
              fontSize: '18px',
              color: theme.palette.primary.main,
            }}
          >
          Record Tech
          </Typography>
        </Box>
        <ArrowBackIosIcon />
      </Box>
      <Divider orientation="vertical" flexItem />
    </Box>
  );
};

export default TopToolbar;