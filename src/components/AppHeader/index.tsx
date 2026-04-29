import { Grow, Box, FormControl, Theme, Toolbar, Typography } from "@mui/material";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { styled, useTheme } from "@mui/material/styles";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "../../api/services/User/store";
import { LANGUAGE_STORAGE_KEY } from "../../i18n";
import AvatarMenu from "../AvatarMenu";

const SUPPORTED_LOCALES = ["en", "de"] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

// Persist the active locale without pulling in i18next-browser-languagedetector
// (issue #5 forbids new runtime deps). Swallow failures so the UI keeps working
// in Safari private mode where localStorage.setItem throws.
const persistLocale = (locale: Locale) => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    /* storage unavailable — selection still applies for this session */
  }
};

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = ((i18n.language || "en").split("-")[0] || "en") as Locale;

  const handleChange = (event: SelectChangeEvent) => {
    const locale = event.target.value as Locale;
    i18n.changeLanguage(locale);
    persistLocale(locale);
  };

  // Controlled open state: if MUI's internal onMouseDown on the select display
  // is ever intercepted (e.g. a parent stopping propagation, or the display div
  // collapsing to zero hit-area in a flex parent), the Box's onMouseDown below
  // still guarantees the dropdown opens. The <Select> sees the open prop and
  // renders its Popover.
  return (
    <Box
      onMouseDown={(e) => {
        // Only left button; don't interfere when clicking inside the menu itself.
        if (e.button === 0) setOpen(true);
      }}
      sx={{ display: "inline-flex", cursor: "pointer" }}
    >
      <FormControl variant="standard" size="small" sx={{ minWidth: 64 }}>
        <Select
          variant="standard"
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          value={current}
          onChange={handleChange}
          disableUnderline
          SelectDisplayProps={{ "aria-label": "change language" }}
          sx={{
            color: "inherit",
            fontWeight: 600,
            fontSize: 14,
            "& .MuiSelect-icon": { color: "inherit" },
            "& .MuiSelect-select": {
              paddingY: "6px",
              paddingRight: "24px !important",
              minHeight: "auto"
            }
          }}
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <MenuItem key={loc} value={loc}>
              {loc.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

interface AppBarProps extends MuiAppBarProps {
  theme?: Theme;
}

interface AppHeaderProps {
  user: User;
  pageTitle: string;
}

const typoStyle = {
  display: "flex",
  alignContent: "center",
  justifyContent: "center",
  lineHeight: 1
};

const AppBar = styled(MuiAppBar)<AppBarProps>(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.common.black,
  color: theme.palette.common.white,
  height: theme.tokens.header.height
}));

const COUNTDOWN_SECONDS = 60 * 60;

const AppHeader = React.forwardRef<HTMLDivElement, AppHeaderProps>((props, ref) => {
  const { user, pageTitle } = props;
  const { t } = useTranslation("app");
  const theme = useTheme();

  const [remainingSeconds, setRemainingSeconds] = useState(COUNTDOWN_SECONDS);
  const countdownMinutes = `${Math.floor(remainingSeconds / 60)}`.padStart(2, "0");
  const countdownSeconds = `${remainingSeconds % 60}`.padStart(2, "0");

  useEffect(() => {
    const deadline = Date.now() + COUNTDOWN_SECONDS * 1000;
    const tick = () => {
      const msLeft = Math.max(0, deadline - Date.now());
      setRemainingSeconds(Math.ceil(msLeft / 1000));
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <AppBar ref={ref} position="fixed" sx={{ width: "100vw" }}>
      <Toolbar sx={{ background: "#08140C 0% 0% no-repeat padding-box" }}>
        <Box sx={{ width: "100%", flexDirection: "row", display: "flex" }}>
          <Box>
            <Typography variant="h6" component="div" color="primary">
              {countdownMinutes}:{countdownSeconds}
            </Typography>
          </Box>
          <Box sx={{ width: 20, height: 20, flex: 1 }} />
          <Box sx={{ flex: 2 }}>
            <Typography
              sx={{
                ...typoStyle,
                color: theme.palette.primary.main,
                mb: theme.spacing(0.5)
              }}
              variant="h6"
              component="div"
            >
              {t("appTitle").toLocaleUpperCase()}
            </Typography>
            <Typography
              sx={{ ...typoStyle }}
              variant="overline"
              component="div"
              noWrap
            >
              {pageTitle.toLocaleUpperCase()}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              justifyContent: "flex-end",
              display: "flex",
              alignItems: "center",
              gap: 1
            }}
          >
            <LanguageSwitcher />
            {user && user.eMail && (
              <Grow in={Boolean(user && user.eMail)}>
                <AvatarMenu user={user} />
              </Grow>
            )}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
});

export default AppHeader;
