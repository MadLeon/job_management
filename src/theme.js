import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

// 创建一个 MUI 主题实例。
const theme = createTheme({
  palette: {
    primary: {
      main: '#03229F',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
  },
});

export default theme;