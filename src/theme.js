import { createTheme } from '@mui/material/styles';
import { red, deepOrange, orange } from '@mui/material/colors';

// 创建一个 MUI 主题实例。
const theme = createTheme({
  palette: {
    primary: {
      main: '#03229F',
    },
    darkRed: {
      main: deepOrange[900],
    },
    orange: {
      main: orange[900],
    },
  },
  typography: {
    regularBold: {
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      fontSize: '16px',
    },
    grayCaption: {
      fontFamily: 'Roboto',
      fontSize: '12px',
      color: '#888888',
    },
    h1: {
      fontFamily: 'Roboto',
      fontWeight: 'bold',
      fontSize: '26px',
    },
    h2: {
      fontFamily: 'Roboto',
      fontWeight: '700',
      fontSize: '20px',
    }
  },
});

export default theme;