import { styled } from '@mui/material/styles';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

/**
 * 根据字符串生成唯一的颜色值
 * 使用哈希算法确保相同的字符串总是生成相同的颜色
 * @param {string} string - 输入字符串（通常为用户名）
 * @returns {string} 生成的RGB十六进制颜色值
 */
function stringToColor(string) {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

/**
 * 根据用户名生成头像对象（包含背景色和首字母）
 * @param {string} name - 用户全名
 * @param {number} [size=30] - 头像尺寸（像素）
 * @returns {Object} 包含sx和children的头像配置对象
 */
function stringAvatar(name, size = 30) {
  return {
    sx: {
      bgcolor: stringToColor(name),
      width: size,
      height: size,
      fontSize: size / 2,
    },
    children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
  };
}

/**
 * 徽章头像组件
 * 显示带有在线状态指示器的用户头像
 * 支持自定义头像图片或自动生成首字母头像
 * @component
 * @param {Object} props - 组件属性
 * @param {string} props.name - 用户名称（用于生成首字母和颜色）
 * @param {string} [props.imgSrc] - 头像图片URL（可选）
 * @returns {JSX.Element} 带徽章的头像组件
 */
export default function BadgeAvatars({ name, imgSrc }) {
  return (
    <Stack direction="row" spacing={2}>
      <StyledBadge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        variant="dot"
      >
        <Avatar alt={name} src={imgSrc} {...stringAvatar(name)} />
      </StyledBadge>
    </Stack>
  );
}
