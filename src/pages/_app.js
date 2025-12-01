import React from 'react';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '../createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';
import Appheader from '../components/AppHeader';
import LeftNavPanel from '../components/LeftNavPanel';
import RecordTechIcon from '../components/RecordTechIcon';

import { Box, Divider } from '@mui/material';
import Sidebar from '@/components/Sidebar';

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
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            display: 'flex',
            // flexDirection: 'column',
            height: '100vh',
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

          {/* Left Nav Panel */}
          <Sidebar />

          <Divider orientation="horizontal" flexItem />

          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'row',
            }}
          >

            <Divider orientation="vertical" flexItem />

            {/* Main Content */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                height: '100%',
                p: 3,
                // display: 'flex',
                // flexDirection: 'column',
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