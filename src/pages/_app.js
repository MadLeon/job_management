import React from 'react';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '../createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';
import TopToolbar from '../components/TopToolbar';
import LeftNavPanel from '../components/LeftNavPanel';
import { Box, Divider } from '@mui/material';

const clientSideEmotionCache = createEmotionCache();

function MyApp(props) {
  const { Component, pageProps, emotionCache = clientSideEmotionCache } = props;

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
          <TopToolbar />
          <Divider orientation="horizontal" flexItem />

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
            <LeftNavPanel />

            <Divider orientation="vertical" flexItem />

            {/* Main Content */}
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Component {...pageProps} />
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default MyApp;