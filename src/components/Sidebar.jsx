import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';


import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import DashboardSidebarContext from '../context/DashboardSidebarContext';

import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';
import DashboardSidebarDividerItem from './DashboardSidebarDividerItem';
import {
  getDrawerSxTransitionMixin,
  getDrawerWidthTransitionMixin,
} from '../helpers/mixins';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../context/constants';

import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailIcon from '@mui/icons-material/Mail';

import PersonIcon from '@mui/icons-material/Person';
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

function Sidebar({
  expanded = true,
  setExpanded,
  disableCollapsibleSidebar = false,
}) {
  const theme = useTheme();

  const [expandedItemIds, setExpandedItemIds] = React.useState([]);
  const [isFullyExpanded, setIsFullyExpanded] = React.useState(expanded);
  const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!expanded);

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

  const mini = !disableCollapsibleSidebar && !expanded;

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

  const hasDrawerTransitions = !disableCollapsibleSidebar;

  const getDrawerContent = React.useCallback(
    () => (
      <React.Fragment>
        <Toolbar sx={{ py: 5 }} />
        <Box
          component="nav"
          aria-label="Navigation"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'auto',
            scrollbarGutter: mini ? 'stable' : 'auto',
            overflowX: 'hidden',
            pt: !mini ? 0 : 2,
            ...(hasDrawerTransitions
              ? getDrawerSxTransitionMixin(isFullyExpanded, 'padding')
              : {}),
          }}
        >
          <Box>
            <List
              sx={{
                padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >
              {/* <DashboardSidebarHeaderItem>Main items</DashboardSidebarHeaderItem> */}
              <DashboardSidebarPageItem
                id="Dashboard"
                title="Dashboard"
                icon={<HomeIcon />}
                href="/Dashboard"
              />

              <DashboardSidebarPageItem
                id="activeJobs"
                title="ActiveJobs"
                icon={<ReceiptIcon />}
                href="/activeJobs"
              />

              <DashboardSidebarPageItem
                id="watchlist"
                title="Watchlist"
                icon={<RemoveRedEyeIcon />}
                href="/watchlist"
              />

              <DashboardSidebarPageItem
                id="taskScheduler"
                title="TaskScheduler"
                icon={<CalendarTodayIcon />}
                href="/taskScheduler"
              />

            </List>

            <Divider />

            <List
              sx={{
                padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >

              <DashboardSidebarPageItem
                id="allDrawings"
                title="AllDrawings"
                icon={<PhotoLibraryIcon />}
                href="/allDrawings"
              />

              <DashboardSidebarPageItem
                id="allJobs"
                title="AllJobs"
                icon={<LayersIcon />}
                href="/allJobs"
              />

              <DashboardSidebarPageItem
                id="allCustomers"
                title="AllCustomers"
                icon={<PeopleIcon />}
                href="/allCustomers"
              />

            </List>

            <Divider />

            <List
              sx={{
                padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >

              <DashboardSidebarPageItem
                id="updates"
                title="Updates"
                icon={<InfoIcon />}
                href="/updates"
              />

              <DashboardSidebarPageItem
                id="settings"
                title="Settings"
                icon={<SettingsIcon />}
                href="/settings"
              />

            </List>
          </Box>

          <Stack>


            <Divider />
            <List
              sx={{
                padding: mini ? 0 : 0.5,
                width: mini ? MINI_DRAWER_WIDTH : 'auto',
              }}
            >
              <DashboardSidebarPageItem
                id="logout"
                title="Logout"
                icon={<LogoutIcon />}
                href="/logout"
              />
            </List>
          </Stack>
        </Box>
      </React.Fragment>
    ),
    [mini, hasDrawerTransitions, isFullyExpanded, expandedItemIds]
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
          position: 'absolute',
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
      {/* <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Toolbar sx={{ height: '100px' }} />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {['Inbox', 'Starred', 'Send email', 'Drafts'].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            {['All mail', 'Trash', 'Spam'].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer> */}
    </DashboardSidebarContext.Provider>
  );
}

export default Sidebar;