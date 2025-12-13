import TodayIcon from '@mui/icons-material/Today';
import { Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';

const date = dayjs(new Date());
const today = date.format('MMM. D, YYYY');

function DateCard() {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <TodayIcon />
      <Typography variant='regularBold'>
        {today}
      </Typography>
    </Stack>
  );
}

export default DateCard;
