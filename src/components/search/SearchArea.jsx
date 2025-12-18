import React from 'react';
import { Stack, Button, IconButton, Autocomplete, TextField } from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchBox from './SearchBox';
import FilterPopover from './FilterPopover';

function SearchArea({ onCreateJobClick, onSearchSelect }) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);
  const id = open ? 'filter-popover' : undefined;

  return (
    <Stack direction="row" width="100%" sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={2}>
        <SearchBox onSelect={onSearchSelect} />
        <Button aria-describedby={id} variant="text" startIcon={<FilterAltIcon />} onClick={handleClick}>
          Filter
        </Button>
        <FilterPopover id={id} open={open} anchorEl={anchorEl} handleClose={handleClose} />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Button variant="text" startIcon={<FilterAltIcon />}>
          Refresh
        </Button>
        <Button
          variant="contained"
          onClick={onCreateJobClick}
        >
          New Job
        </Button>
        <IconButton
          size="large"
          aria-label="option menu"
        >
          <SettingsIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Stack>
    </Stack>
  );
}

export default SearchArea;
