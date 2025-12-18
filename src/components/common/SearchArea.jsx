import React from 'react';
import { Stack, Button, IconButton, Autocomplete, TextField } from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchBox from './SearchBox';

function SearchArea({ onCreateJobClick }) {
  return (
    <Stack direction="row" width="100%" sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={2}>
        <SearchBox />
        <Autocomplete
          disablePortal
          size='small'
          options={['The Shawshank Redemption', 'The Godfather', 'The Dark Knight', 'Pulp Fiction']}
          sx={{ width: 150 }}
          renderInput={(params) => <TextField {...params} label="Sort By" />}
        />
        <Button variant="text" startIcon={<FilterAltIcon />}>
          Filter
        </Button>
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
