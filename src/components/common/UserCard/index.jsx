import { Stack, Typography } from '@mui/material';
import BadgeAvatars from './BadgeAvatars';

/**
 * 用户卡片组件
 * 显示用户头像、名称和职位信息的卡片
 * 用于应用头部和其他需要显示用户信息的场景
 * @component
 * @returns {JSX.Element} 用户卡片组件
 */
function UserCard({ name = "Leon Liu", position = "Position" }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      {/* <BadgeAvatars name="Leon Liu" imgSrc="/static/images/avatar/1.jpg" /> */}
      <BadgeAvatars name={name} />
      <Stack direction="column">
        <Typography variant='regularBold'>
          {name.split(' ')[0]}
        </Typography>
        <Typography variant='grayCaption'>
          {position}
        </Typography>
      </Stack>
    </Stack >
  );
}

export default UserCard;
