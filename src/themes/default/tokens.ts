export interface OsapiensColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  lighten0: string;
  lighten1: string;
  lighten2: string;
  lighten3: string;
  lighten4: string;
  lighten5: string;
  lighten6: string;
  darken0: string;
  darken1: string;
  darken2: string;
  darken3: string;
  darken4: string;
  darken5: string;
  darken6: string;
}

export interface OsapiensFont {
  fontFamily: string;
  fontStyle: string;
  fontDisplay: string;
  fontWeight: number;
  src: string;
}

export interface OsapiensThemeTokens {
  style: {
    radius: number;
  };
  color: OsapiensColors;
  breakpoints: {
    breakpointXs: number;
    breakpointSm: number;
    breakpointMd: number;
    breakpointLg: number;
    breakpointXl: number;
    breakpointMobile: number;
    breakpointTablet: number;
    breakpointLaptop: number;
    breakpointDesktop: number;
  };
  fonts: OsapiensFont[];
  images: {
    background: string;
  };
  tabbedHeader: {
    height: string;
  };
  header: {
    height: string;
  };
}

export const colors: OsapiensColors = {
  primary: "#4bc676",
  secondary: "#407d6a",
  success: "#90c62c",
  warning: "#eebf00",
  error: "#d55342",
  lighten0: "rgba(255, 255, 255, 0.03)",
  lighten1: "rgba(255, 255, 255, 0.05)",
  lighten2: "rgba(255, 255, 255, 0.12)",
  lighten3: "rgba(255, 255, 255, 0.24)",
  lighten4: "rgba(255, 255, 255, 0.38)",
  lighten5: "rgba(255, 255, 255, 0.5)",
  lighten6: "rgba(255, 255, 255, 0.85)",
  darken0: "rgba(0, 0, 0, 0.03)",
  darken1: "rgba(0, 0, 0, 0.07)",
  darken2: "rgba(0, 0, 0, 0.12)",
  darken3: "rgba(0, 0, 0, 0.24)",
  darken4: "rgba(0, 0, 0, 0.38)",
  darken5: "rgba(0, 0, 0, 0.5)",
  darken6: "rgba(0, 0, 0, 0.85)"
};

export const fonts: OsapiensFont[] = [];

export const tokens: OsapiensThemeTokens = {
  color: colors,
  style: {
    radius: 4
  },
  breakpoints: {
    breakpointXs: 0,
    breakpointSm: 600,
    breakpointMd: 960,
    breakpointLg: 1280,
    breakpointXl: 1920,
    breakpointMobile: 340,
    breakpointTablet: 640,
    breakpointLaptop: 800,
    breakpointDesktop: 1024
  },
  fonts,
  images: {
    background: "transparent" // require("!!url-loader!./assets/background-pattern.svg"),
  },
  tabbedHeader: {
    height: "80px"
  },
  header: {
    height: "64px"
  }
};

export default tokens;
