import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Stack from '@mui/material/Stack';
import DateCard from './DateCard';
import UserCard from './UserCard';
import { Divider } from '@mui/material';
import { DRAWER_WIDTH } from '../context/constants';

const AppBar = styled(MuiAppBar)(({ theme }) => ({
  borderWidth: 0,
  borderBottomWidth: 1,
  borderStyle: 'solid',
  borderColor: (theme.vars ?? theme).palette.divider,
  boxShadow: 'none',
  zIndex: theme.zIndex.drawer + 1,
}));

const LogoContainer = styled('div')({
  position: 'relative',
  height: 40,
  display: 'flex',
  alignItems: 'center',
  '& img': {
    maxHeight: 40,
  },
});

function AppHeader({ logo, title, menuOpen, onToggleMenu }) {
  const theme = useTheme();

  const handleMenuOpen = React.useCallback(() => {
    onToggleMenu(!menuOpen);
  }, [menuOpen, onToggleMenu]);

  const getMenuIcon = React.useCallback(
    (isExpanded) => {
      const expandMenuActionText = 'Expand';
      const collapseMenuActionText = 'Collapse';

      return (
        <Tooltip
          title={`${isExpanded ? collapseMenuActionText : expandMenuActionText} menu`}
          enterDelay={1000}
        >
          <div>
            <IconButton
              size="large"
              aria-label={`${isExpanded ? collapseMenuActionText : expandMenuActionText} navigation menu`}
              onClick={handleMenuOpen}
            >
              {isExpanded ? <ArrowBackIosIcon sx={{ fontSize: 18 }} /> : <MenuIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </div>
        </Tooltip>
      );
    },
    [handleMenuOpen],
  );

  return (
    <AppBar color="inherit" sx={{ displayPrint: 'none' }}>
      <Toolbar sx={{ backgroundColor: 'inherit', py: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            width: '100%',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent='space-between' sx={{ width: `${DRAWER_WIDTH}px` }}>
            {/* Logo Area */}
            <Stack direction="row" alignItems="center" spacing={2}>
              {logo ? <LogoContainer>{logo}</LogoContainer> : null}
              {title ? (
                <Typography
                  variant="h6"
                  sx={{
                    color: (theme.vars ?? theme).palette.primary.main,
                    fontSize: 18,
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {title}
                </Typography>
              ) : null}
            </Stack>
            <Box display="inline-flex" alignItems="center">{getMenuIcon(menuOpen)}</Box>
          </Stack>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ marginLeft: 'auto' }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <DateCard />
              <Divider orientation="vertical" flexItem />
              <UserCard />
            </Stack>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar >
  );
}

export default AppHeader;