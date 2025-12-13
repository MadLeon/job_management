import { Stack, Typography } from '@mui/material';

import BadgeAvatars from './BadgeAvata';

function UserCard() {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      {/* <BadgeAvatars name="Leon Liu" imgSrc="/static/images/avatar/1.jpg" /> */}
      <BadgeAvatars name="Leon Liu" />
      <Stack direction="column">
        <Typography variant='regularBold'>
          Leon Liu
        </Typography>
        <Typography variant='grayCaption'>
          QA Clerk
        </Typography>
      </Stack>
    </Stack >
  );
}

export default UserCard;