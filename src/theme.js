import { createTheme } from "@mui/material/styles";
import { red, deepOrange, orange } from "@mui/material/colors";

// 创建一个 MUI 主题实例。
const theme = createTheme({
  palette: {
    primary: {
      main: "#03229F",
    },
    darkRed: {
      main: deepOrange[900],
    },
    orange: {
      main: orange[900],
    },
  },
  typography: {
    fontFamily: [
      "Roboto",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Arial",
      "sans-serif",
    ].join(","),
    regularBold: {
      fontFamily: "Roboto",
      fontWeight: "bold",
      fontSize: "16px",
    },
    grayCaption: {
      fontFamily: "Roboto",
      fontSize: "12px",
      color: "#888888",
    },
    caption: {
      fontFamily: "Roboto",
      fontWeight: 500,
      fontSize: "14px",
      letterSpacing: "0.5px",
      color: "rgba(0, 0, 0, 0.6)",
    },
    h1: {
      fontFamily: "Roboto",
      fontWeight: "bold",
      fontSize: "26px",
    },
    h2: {
      fontFamily: "Roboto",
      fontWeight: "700",
      fontSize: "20px",
    },
    h3: {
      fontFamily: "Roboto",
      fontWeight: "600",
      fontSize: "18px",
    },
  },
});

export default theme;
