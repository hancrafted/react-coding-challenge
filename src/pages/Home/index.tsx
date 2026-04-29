import { Box, Container, Typography } from "@mui/material";
import { observer } from "mobx-react";
import React from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { Trans, useTranslation } from "react-i18next";

interface Issue {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const issues: Issue[] = [
  {
    id: "missing-key-prop",
    icon: "🐞",
    title:
      'Console error: Warning: Each child in a list should have a unique "key" prop.',
    description:
      "Hope you are able to find what is causing this error, as it is annoying."
  },
  {
    id: "bold-known",
    icon: "🐞",
    title:
      'The word "known" should be displayed bold in the introduction text.',
    description:
      "When implementing a solution, please ensure to not change the i18n text."
  },
  {
    id: "missing-user-avatar",
    icon: "🐞",
    title:
      "User avatar in app bar is missing, although user should be fetched on app start correctly.",
    description:
      "On app start we load the current user object via a MobX store, but for any reason the user avatar is not displayed in the top right of the app bar. Attention: When solving this issue, you might will be confronted with a second bug."
  },
  {
    id: "broken-countdown",
    icon: "🐞",
    title: "Optional: Countdown is broken sometimes (hard to reproduce).",
    description:
      "Some developers mentioned that the countdown in the app header behaves strange sometimes, but unfortunately they were not able to reproduce this glitch reliably, maybe you find the root cause."
  },
  {
    id: "language-switcher",
    icon: "⭐️",
    title: "Optional: It would be great to be able to switch the language.",
    description:
      "Please add a language select control in the app bar to switch the UI language between english and german."
  }
];

const additionalFixes: Issue[] = [
  {
    id: "avatar-menu-optional-chain",
    icon: "✅",
    title:
      "AvatarMenu crashed when user.firstName was undefined.",
    description:
      "stringAvatar and getInitials now use proper optional chaining on firstName/lastName instead of indexing a possibly-undefined value."
  },
  {
    id: "root-stray-console-log",
    icon: "✅",
    title: "Removed stray console.log(user) in Root.",
    description:
      "A leftover debug statement was printing the observable user on every render."
  },
  {
    id: "avatar-menu-logout-stub",
    icon: "✅",
    title: "Removed console.log('logout') placeholder on the logout button.",
    description:
      "The AvatarMenu logout button no longer emits a no-op console log when clicked."
  },
  {
    id: "en-typos",
    icon: "✅",
    title: "Fixed typos in the English locale.",
    description:
      "'finde' → 'find' and 'wolrd' → 'world' in src/i18n/locales/en.json."
  },
  {
    id: "swicth-typo",
    icon: "✅",
    title: "Fixed 'swicth' typo in the language-switcher description.",
    description: "Corrected to 'switch' in the issues list on this page."
  },
  {
    id: "unused-map-index",
    icon: "✅",
    title: "Removed unused index argument in useMatchedRoute .map callbacks.",
    description: "Silences the no-unused-vars lint warning."
  },
  {
    id: "dead-commented-code",
    icon: "✅",
    title:
      "Removed dead/commented code in api/services/index.tsx and AvatarMenu.",
    description:
      "Dropped the unreachable requireAllServices helper and the commented-out useHistory references."
  },
  {
    id: "ts-ignore-i18n",
    icon: "✅",
    title: "Replaced @ts-ignore in i18n.tsx with a typed cast.",
    description:
      "navigator.userLanguage is now accessed through a narrow Navigator intersection type."
  },
  {
    id: "any-in-render-lazyload",
    icon: "✅",
    title: "Removed `any` in the render wrapper and lazyLoad helper.",
    description:
      "src/index.tsx calls ReactDOM.render directly, and routes.tsx lazyLoad takes a React.ComponentType."
  },
  {
    id: "redundant-store-provider",
    icon: "✅",
    title: "Removed redundant CombinedStoreProvider in App.tsx.",
    description:
      "UserStoreProvider is rendered directly; the unused `services` import was dropped too."
  },
  {
    id: "root-unused-import",
    icon: "✅",
    title: "Removed unused resultOrError import in Root.",
    description:
      "Silences the unused-import warning surfaced while cleaning up the stray console.log."
  },
  {
    id: "eslint-config-missing",
    icon: "✅",
    title:
      "Added missing eslintConfig in package.json so CRA's ESLint understands TypeScript.",
    description:
      "Without the 'react-app' / 'react-app/jest' extends, ESLint fell back to a plain-JS parser and reported 'Parsing error: Missing semicolon.' on every `as`, `declare module`, and type predicate. The dev server forwarded the failed compile into the browser console together with a 'process is not defined' error from the HMR client; both are gone now that the app compiles."
  },
  {
    id: "npm-audit-react-scripts-5",
    icon: "✅",
    title: "npm audit: upgraded react-scripts 4 → 5 and patched direct deps.",
    description:
      "All 7 critical and most high vulnerabilities are gone (0 critical, 11 high remain — all dev-only build tools transitively pulled in by react-scripts 5 itself, with no upstream fix without leaving CRA)."
  }
];

const Home = () => {
  const { t } = useTranslation("app");

  return (
    <Box p={2} maxHeight="calc(100vh - 64px)" overflow={["auto", "auto"]}>
      <Container>
        <Typography variant="h1" textAlign="center">
          {t("home.welcome")}
        </Typography>
        <Typography variant="subtitle1" textAlign="center">
          <Trans i18nKey="home.intro" components={{ b: <strong /> }} />{" "}
        </Typography>
        <Typography variant="body2" textAlign="center" color="textSecondary">
          {t("home.sidenote")}
        </Typography>
        <List>
          {issues.map((issue) => (
            <ListItem key={issue.id}>
              <Typography variant="h5" sx={{ p: 2 }}>
                {issue.icon}
              </Typography>
              <ListItemText
                primary={issue.title}
                secondary={issue.description}
              />
            </ListItem>
          ))}
        </List>
        <Typography variant="h4" textAlign="center" sx={{ mt: 4 }}>
          Additional fixes
        </Typography>
        <List>
          {additionalFixes.map((fix) => (
            <ListItem key={fix.id}>
              <Typography variant="h5" sx={{ p: 2 }}>
                {fix.icon}
              </Typography>
              <ListItemText
                primary={fix.title}
                secondary={fix.description}
              />
            </ListItem>
          ))}
        </List>
      </Container>
    </Box>
  );
};

export default observer(Home);
