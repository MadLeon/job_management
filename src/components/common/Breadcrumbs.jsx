import * as React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useRouter } from 'next/router';

export default function Breadcrumb({ locationLayer, href }) {
  const router = useRouter();

  const handleClick = (event, url) => {
    event.preventDefault();
    router.push(url);
  };

  let accumulatedPath = '';

  const breadcrumbs = Array.isArray(locationLayer) ? locationLayer.map((layer, index) => {
    if (index !== locationLayer.length - 1) {
      return (
        <Link
          underline="hover"
          key={index}
          color="inherit"
          href={href[index]}
          onClick={(event) => handleClick(event, href[index])}
        >
          <Typography key={index} variant='grayCaption' sx={{ fontSize: '14px' }}>
            {layer}
          </Typography>
        </Link>
      );
    } else {
      return (
        <Chip
          key={index}
          size='small'
          label={
            <b>{layer}</b>
          }>
        </Chip>
      );
    }
  }) : [];

  return (
    <Stack spacing={2}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
      >
        {breadcrumbs}
      </Breadcrumbs>
    </Stack>
  );
}
