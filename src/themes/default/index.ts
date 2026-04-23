import { merge } from "lodash";

import { createTheme } from "@mui/material/styles";

// import MaterialDesignIcons from "!!url-loader!@mdi/font/fonts/materialdesignicons-webfont.woff2"
import tokens, { fonts, OsapiensThemeTokens } from "./tokens";

// TODO: override styles of all anchor elements
// a,
// a:hover {
//   color: $primary;
// }
// a:visited {
//   color: adjust-color($color: $primary, $lightness: -20%);
// }

declare module "@mui/material/styles" {
  interface Theme {
    tokens: OsapiensThemeTokens;
  }
  interface BreakpointOverrides {
    xs: true;
    sm: true;
    md: true;
    lg: true;
    xl: true;
    mobile: true;
    tablet: true;
    laptop: true;
    desktop: true;
  }
}

const commonTheme = {
  palette: {
    mode: "light",
    primary: {
      // light: tokens.color.primary, // will be calculated from palette.primary.main
      main: tokens.color.primary
      // dark: tokens.color.primary, // will be calculated from palette.primary.main
    },
    secondary: {
      // light: tokens.color.secondary, // will be calculated from palette.primary.main
      main: tokens.color.secondary
      // dark: tokens.color.secondary, // will be calculated from palette.primary.main
    },
    success: {
      // light: tokens.color.success, // will be calculated from palette.primary.main
      main: tokens.color.success
      // dark: tokens.color.success, // will be calculated from palette.primary.main
    },
    warning: {
      // light: tokens.color.warning, // will be calculated from palette.primary.main
      main: tokens.color.warning
      // dark: tokens.color.warning, // will be calculated from palette.primary.main
    },
    error: {
      // light: tokens.color.error, // will be calculated from palette.primary.main
      main: tokens.color.error
      // dark: tokens.color.error, // will be calculated from palette.primary.main
    },
    // Used by `getContrastText()` to maximize the contrast between
    // the background and the text.
    contrastThreshold: 3,
    // Used by the functions below to shift a color's luminance by approximately
    // two indexes within its tonal palette.
    // E.g., shift from Red 500 to Red 300 or Red 700.
    tonalOffset: {
      light: 0.2,
      dark: 0.2
    }
  },
  shape: {
    borderRadius: tokens.style.radius
  },
  breakpoints: {
    values: {
      xs: tokens.breakpoints.breakpointXs,
      sm: tokens.breakpoints.breakpointSm,
      md: tokens.breakpoints.breakpointMd,
      lg: tokens.breakpoints.breakpointLg,
      xl: tokens.breakpoints.breakpointXl,
      mobile: tokens.breakpoints.breakpointMobile,
      tablet: tokens.breakpoints.breakpointTablet,
      laptop: tokens.breakpoints.breakpointLaptop,
      desktop: tokens.breakpoints.breakpointDesktop
    }
  },
  overrides: {
    MuiCssBaseline: {
      "@global": {
        "@font-face": fonts
      }
    }
  }
};

const muiBaseTheme = createTheme();

const tokensLight: any = merge({}, commonTheme, {
  palette: {
    mode: "light"
  },
  tokens
});

const tokensDark: any = merge({}, commonTheme, {
  palette: {
    mode: "dark",
    background: {
      default: muiBaseTheme.palette.common.black,
      paper: muiBaseTheme.palette.grey["900"]
    }
  },
  tokens
});

const osapiensTheme = {
  light: createTheme(tokensLight),
  dark: createTheme(tokensDark)
};

export default osapiensTheme;
