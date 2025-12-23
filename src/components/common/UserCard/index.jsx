import { Stack, Typography } from '@mui/material';
import BadgeAvatars from './BadgeAvatars';

/**
 * 用户卡片组件
 * 显示用户头像、名称和职位信息的卡片
 * 用于应用头部和其他需要显示用户信息的场景
 * @component
 * @returns {JSX.Element} 用户卡片组件
 */
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
