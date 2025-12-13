import React from 'react';
import { CacheProvider } from '@emotion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

import createEmotionCache from '../createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Divider, Toolbar } from '@mui/material';

import Appheader from '../components/layout/AppHeader';
import RecordTechIcon from '../components/shared/RecordTechIcon';
import Sidebar from '../components/layout/Sidebar';

const clientSideEmotionCache = createEmotionCache();

function MyApp(props) {
  const { Component, pageProps, emotionCache = clientSideEmotionCache } = props;

  const [isNavigationExpanded, setIsNavigationExpanded] = React.useState(true);

  const handleToggleHeaderMenu = React.useCallback(
    (isExpanded) => {
      setIsNavigationExpanded(isExpanded);
    },
    [setIsNavigationExpanded],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <Box
            sx={{
              display: 'flex',
              // flexDirection: 'column',
              height: '100%',
              minHeight: '100vh',
              width: '100%',
              backgroundColor: '#eeeeee',
            }}
          >
            <CssBaseline />
            {/* Top Toolbar */}
            <Appheader
              position="fixed"
              logo={<RecordTechIcon />}
              title="Record Tech"
              menuOpen={isNavigationExpanded}
              onToggleMenu={handleToggleHeaderMenu}
              sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
              }}
            />

            {/* Side Bar */}
            <Sidebar
              expanded={isNavigationExpanded}
              setExpanded={setIsNavigationExpanded}
              sx={{
                position: 'fixed', // Make the sidebar stick to the viewport
                height: '100vh',    // Ensure it covers the full height
              }}
            />

            <Divider orientation="horizontal" flexItem />

            {/* Main Content Area */}
            <Box
              component="main"
              sx={{
                width: '100%',
                height: '100%',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >

              {/* <Divider orientation="vertical" flexItem /> */}

              {/* Main Content */}
              <Box
                component="main"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  height: '100%',
                  // minHeight: '100vh',
                  p: 3,
                }}
              >
                <Toolbar />
                <Component {...pageProps} />
              </Box>
            </Box>
          </Box>
        </ThemeProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
}

export default MyApp;