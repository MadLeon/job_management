import React from 'react';
import { Stack, Box } from '@mui/material';
import { Autocomplete, TextField } from '@mui/material';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SettingsIcon from '@mui/icons-material/Settings';

import Breadcrumb from '@/components/common/Breadcrumbs';
import PageTitle from '@/components/common/PageTitle';
import ItemContainer from '@/components/ui/ItemContainer';
import SearchBox from '@/components/common/SearchBox';
import JobTable from '@/components/table/JobTable';

import { useJobs } from '@/lib/hooks/useJobs'

function ActiveJobs() {
  const { data: jobs = [], isLoading } = useJobs();

  const configArea = (
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
        <Button variant="contained">
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

  const jobsArea = (<JobTable data={jobs} isLoading={isLoading} />);

  return (
    <Stack spacing={3} >
      <Breadcrumb locationLayer={['All Jobs', 'Active Jobs']} href={["all-jobs", "active-jobs"]} />
      <PageTitle title="Active Jobs" />
      <ItemContainer content={configArea} />
      <ItemContainer title="All Active Jobs" content={jobsArea} />
    </Stack>
  );
}

export default ActiveJobs;