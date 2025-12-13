import { Box, Divider, Stack } from '@mui/material';

import ContainerTitle from './ContainerTitle';

export default function ItemContainer({ title, content }) {
  return (
    <Stack width='100%' sx={{ backgroundColor: '#FFFFFF', borderRadius: '10px' }}>
      {title ? (
        <Box>
          <ContainerTitle title={title} />
          <Divider />
        </Box>
      ) : null}

      <Stack direction="row">
        {content}
      </Stack>
    </Stack >
  );
}