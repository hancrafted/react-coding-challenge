import React, { Suspense } from "react";
import { SnackbarProvider } from "notistack";

import { HashRouter } from "react-router-dom";

import services from "./api/services";

import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import StylesProvider from "@mui/styles/StylesProvider";

import RootComponent from "./pages/Root/index";
import { osapiens } from "./themes";

import "./i18n";
import { StoreProvider as UserStoreProvider } from "./api/services/User";

const theme = osapiens.light;

const PREFIX = "App";

const classes = {
  success: `${PREFIX}-success`,
  error: `${PREFIX}-error`,
  warning: `${PREFIX}-warning`,
  info: `${PREFIX}-info`
};

const CombinedStoreProvider: React.FC<{}> = ({ children }) => {
  return <UserStoreProvider>{children}</UserStoreProvider>;
};

const AppContainer = () => {
  return (
    <>
      <CssBaseline />
      {/* Kickstart a simple scoped CSS baseline to build upon. */}
      {/* Required to override Material-UI's styles via CSS modules. */}
      <Suspense fallback={<div>loading...</div>}>
        <CombinedStoreProvider>
          <SnackbarProvider
            maxSnack={3}
            classes={{
              variantSuccess: classes.success,
              variantError: classes.error,
              variantWarning: classes.warning,
              variantInfo: classes.info
            }}
          >
            <StylesProvider injectFirst>
              <ThemeProvider theme={theme}>
                <HashRouter>
                  <RootComponent />
                </HashRouter>
              </ThemeProvider>
            </StylesProvider>
          </SnackbarProvider>
        </CombinedStoreProvider>
      </Suspense>
    </>
  );
};

export default AppContainer;
