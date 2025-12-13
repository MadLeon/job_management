import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/router';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import LayersIcon from '@mui/icons-material/Layers';
import PeopleIcon from '@mui/icons-material/People';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

import DashboardSidebarContext from '../../context/DashboardSidebarContext';
import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import {
  getDrawerSxTransitionMixin,
  getDrawerWidthTransitionMixin,
} from '../../helpers/mixins';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../../context/constants';
import { matchPath } from '../../helpers/matchPath';

function Sidebar({
  expanded = true,
  setExpanded,
  disableCollapsibleSidebar = false,  // currently not used
}) {
  const theme = useTheme();
  const router = useRouter();
  const { pathname } = router;

  const [expandedItemIds, setExpandedItemIds] = React.useState([]);
  const [isFullyExpanded, setIsFullyExpanded] = React.useState(expanded);
  const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!expanded);

  // ----------------------------------------------------------------------
  // Handle fully expanded/collapsed states after drawer width transition
  // ----------------------------------------------------------------------
  React.useEffect(() => {
    if (expanded) {
      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyExpanded(true);
      }, theme.transitions.duration.enteringScreen);
      return () => clearTimeout(drawerWidthTransitionTimeout);
    }
    setIsFullyExpanded(false);
    return () => { };
  }, [expanded, theme.transitions.duration.enteringScreen]);
  React.useEffect(() => {
    if (!expanded) {
      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyCollapsed(true);
      }, theme.transitions.duration.leavingScreen);
      return () => clearTimeout(drawerWidthTransitionTimeout);
    }
    setIsFullyCollapsed(false);
    return () => { };
  }, [expanded, theme.transitions.duration.leavingScreen]);
  // ----------------------------------------------------------------------

  const mini = !disableCollapsibleSidebar && !expanded;

  // Handle page item click
  const handlePageItemClick = React.useCallback(
    (itemId, hasNestedNavigation) => {
      if (hasNestedNavigation && !mini) {
        setExpandedItemIds((previousValue) =>
          previousValue.includes(itemId)
            ? previousValue.filter(
              (previousValueItemId) => previousValueItemId !== itemId,
            )
            : [...previousValue, itemId],
        );
      } else if (!hasNestedNavigation) {
        setExpanded(false);
      }
    },
    [mini, setExpanded],
  );

  const hasDrawerTransitions = !disableCollapsibleSidebar;  // currently always true

  const getDrawerContent = React.useCallback(
    () => (
      <React.Fragment>
        <Toolbar />
        <Box
          component="nav"
          aria-label="Navigation"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'auto',
            // scrollbarGutter: mini ? 'stable' : 'auto',
            overflowX: 'hidden',
            py: 2,
            ...(hasDrawerTransitions
              ? getDrawerSxTransitionMixin(isFullyExpanded, 'padding')
              : {}),
          }}
        >
          <Stack spacing={2}>
            <List
              sx={{
                // padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >
              {/* <DashboardSidebarHeaderItem>Main items</DashboardSidebarHeaderItem> */}
              <DashboardSidebarPageItem
                id="dashboard"
                title="Dashboard"
                icon={<HomeIcon />}
                href="/dashboard"
                selected={!!matchPath('/dashboard/*', pathname) || pathname === '/'}
              />

              <DashboardSidebarPageItem
                id="activeJobs"
                title="Active Jobs"
                icon={<ReceiptIcon />}
                href="/active-jobs"
                selected={!!matchPath('/active-jobs/*', pathname)}
              />

              <DashboardSidebarPageItem
                id="watchlist"
                title="Watchlist"
                icon={<RemoveRedEyeIcon />}
                href="/watch-list"
                selected={!!matchPath('/watch-list/*', pathname)}
              />

              <DashboardSidebarPageItem
                id="taskScheduler"
                title="Task Scheduler"
                icon={<CalendarTodayIcon />}
                href="/task-scheduler"
                selected={!!matchPath('/task-scheduler/*', pathname)}
              />

            </List>

            <Divider />

            <List
              sx={{
                // padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >

              <DashboardSidebarPageItem
                id="allDrawings"
                title="All Drawings"
                icon={<PhotoLibraryIcon />}
                href="/all-drawings"
                selected={!!matchPath('/all-drawings/*', pathname)}
              />

              <DashboardSidebarPageItem
                id="allJobs"
                title="All Jobs"
                icon={<LayersIcon />}
                href="/all-jobs"
                selected={!!matchPath('/all-jobs/*', pathname)}
              />

              <DashboardSidebarPageItem
                id="allCustomers"
                title="All Customers"
                icon={<PeopleIcon />}
                href="/all-customers"
                selected={!!matchPath('/all-customers/*', pathname)}
              />

            </List>

            <Divider />

            <List
              sx={{
                // padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >

              <DashboardSidebarPageItem
                id="updates"
                title="Updates"
                icon={<InfoIcon />}
                href="/updates"
                selected={!!matchPath('/updates/*', pathname)}
              />

              <DashboardSidebarPageItem
                id="settings"
                title="Settings"
                icon={<SettingsIcon />}
                href="/settings"
                selected={!!matchPath('/settings/*', pathname)}
              />

            </List>
          </Stack>

          <Stack spacing={2}>
            <Divider />
            <List
              sx={{
                // padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >
              <DashboardSidebarPageItem
                id="logout"
                title="Logout"
                icon={<LogoutIcon />}
                href="/logout"
                selected={!!matchPath('/logout/*', pathname)}
              />
            </List>
          </Stack>
        </Box>
      </React.Fragment>
    ),
    [mini, hasDrawerTransitions, isFullyExpanded, expandedItemIds, pathname]
  );


  const getDrawerSharedSx = React.useCallback(
    (isTemporary) => {
      const drawerWidth = mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;

      return {
        displayPrint: 'none',
        width: drawerWidth,
        flexShrink: 0,
        ...getDrawerWidthTransitionMixin(expanded),
        ...(isTemporary ? { position: 'absolute' } : {}),
        [`& .MuiDrawer-paper`]: {
          // position: 'absolute',
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundImage: 'none',
          ...getDrawerWidthTransitionMixin(expanded),
        },
      };
    },
    [expanded, mini],
  );

  const sidebarContextValue = React.useMemo(() => {
    return {
      onPageItemClick: handlePageItemClick,
      mini,
      fullyExpanded: isFullyExpanded,
      fullyCollapsed: isFullyCollapsed,
      hasDrawerTransitions,
    };
  }, [
    handlePageItemClick,
    mini,
    isFullyExpanded,
    isFullyCollapsed,
    hasDrawerTransitions,
  ]);

  return (
    <DashboardSidebarContext.Provider value={sidebarContextValue}>
      <Drawer
        variant="permanent"
        sx={{
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent()}
      </Drawer>
    </DashboardSidebarContext.Provider>
  );
}

export default Sidebar;
