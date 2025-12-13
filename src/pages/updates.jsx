import React from 'react';
import Typography from '@mui/material/Typography';
import Breadcrumb from '../components/common/Breadcrumbs';
import { Stack } from '@mui/material';
import PageTitle from '@/components/common/PageTitle';
import updates from '../../data/updates.json';

function Updates() {
  return (
    <Stack spacing={3} sx={{ height: '100%' }}>
      <Breadcrumb locationLayer={["Updates"]} />
      <PageTitle title="Updates" />
      <Stack spacing={3} sx={{ width: 'fit-content' }}>
        {updates.map((update, index) => (
          <Stack key={index} spacing={1}>
            <Stack spacing={1}>
              {
                update.description.map((line, idx) => (
                  <Typography key={idx} variant="body2" sx={{ mb: 2 }}>
                    {idx + 1 + ". "}{line}
                  </Typography>
                ))
              }
            </Stack>
            <Typography align='right' variant="grayCaption">
              Update Time: {update.updateTime}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

export default Updates;