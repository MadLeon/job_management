import * as React from 'react';
import { useRouter } from 'next/router';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DashboardSidebarContext from '../../context/DashboardSidebarContext';
import { MINI_DRAWER_WIDTH } from '../../context/constants';

function SidebarPageItem({
  id,
  title,
  icon,
  href,
  action,
  defaultExpanded = false,
  expanded = defaultExpanded,
  selected = false,
  disabled = false,
  nestedNavigation,
}) {
  const sidebarContext = React.useContext(DashboardSidebarContext);
  if (!sidebarContext) {
    throw new Error('Sidebar context was used without a provider.');
  }
  const {
    onPageItemClick,
    mini = false,
    fullyExpanded = true,
    fullyCollapsed = false,
  } = sidebarContext;

  const router = useRouter();

  const handleClick = React.useCallback(() => {
    if (onPageItemClick) {
      onPageItemClick(id, !!nestedNavigation);
    }
    if (!nestedNavigation) {
      router.push(href); // 使用 router.push 进行导航
    }
  }, [onPageItemClick, id, nestedNavigation, href, router]);

  // const handleClick = React.useCallback(() => {
  //   if (onPageItemClick) {
  //     onPageItemClick(id, !!nestedNavigation);
  //   }
  // }, [onPageItemClick, id, nestedNavigation]);

  let nestedNavigationCollapseSx = { display: 'none' };
  if (mini && fullyCollapsed) {
    nestedNavigationCollapseSx = {
      fontSize: 18,
      position: 'absolute',
      top: '41.5%',
      right: '2px',
      transform: 'translateY(-50%) rotate(-90deg)',
    };
  } else if (!mini && fullyExpanded) {
    nestedNavigationCollapseSx = {
      ml: 0.5,
      fontSize: 20,
      transform: `rotate(${expanded ? 0 : -90}deg)`,
      transition: (theme) =>
        theme.transitions.create('transform', {
          easing: theme.transitions.easing.sharp,
          duration: 100,
        }),
    };
  }

  return (
    <React.Fragment>
      <ListItem
        disablePadding
        sx={{
          display: 'block',
          py: 0,
          px: 1,
          overflowX: 'hidden',
        }}
      >
        <ListItemButton
          selected={selected}
          disabled={disabled}
          sx={{
            height: mini ? 50 : 'auto',
          }}
          {...(nestedNavigation && !mini
            ? {
              onClick: handleClick,
            }
            : {})}
          {...(!nestedNavigation
            ? {
              // to: href,
              onClick: handleClick,
            }
            : {})}
        >
          {icon || mini ? (
            <Box
              sx={
                mini
                  ? {
                    position: 'absolute',
                    left: '50%',
                    top: 'calc(50% - 6px)',
                    // top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }
                  : {}
              }
            >
              <ListItemIcon
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: mini ? 'center' : 'auto',
                }}
              >
                {icon ?? null}
                {!icon && mini ? (
                  <Avatar
                    sx={{
                      fontSize: 10,
                      height: 16,
                      width: 16,
                    }}
                  >
                    {title
                      .split(' ')
                      .slice(0, 2)
                      .map((titleWord) => titleWord.charAt(0).toUpperCase())}
                  </Avatar>
                ) : null}
              </ListItemIcon>
              {mini ? (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: -18,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    fontWeight: 500,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: MINI_DRAWER_WIDTH - 28,
                  }}
                >
                  {title}
                </Typography>
              ) : null}
            </Box>
          ) : null}
          {!mini ? (
            <ListItemText
              primary={title}
              sx={{
                whiteSpace: 'nowrap',
                zIndex: 1,
              }}
            />
          ) : null}
          {action && !mini && fullyExpanded ? action : null}
          {nestedNavigation ? (
            <ExpandMoreIcon sx={nestedNavigationCollapseSx} />
          ) : null}
        </ListItemButton>
      </ListItem>
    </React.Fragment>
  );
}

export default SidebarPageItem;
