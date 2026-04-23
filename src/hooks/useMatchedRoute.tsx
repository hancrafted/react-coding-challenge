import { Box, Fade, Grow, Slide } from "@mui/material";
import React from "react";
import { matchPath, Route, Switch, useLocation } from "react-router-dom";
import { PathParams, TRoute } from "../types/global";
import { validateParams } from "../utils/router";

interface UseMatchedRouteOptions {
  notFoundComponent?: React.FC;
  matchOnSubPath?: boolean;
  transition?:
    | "none"
    | "fade"
    | "grow"
    | "slide-up"
    | "slide-down"
    | "slide-left"
    | "slide-right";
}

const useMatchedRoute = (
  routes: ReadonlyArray<TRoute>,
  fallbackComponent?: React.FC,
  options?: UseMatchedRouteOptions
): {
  route: TRoute;
  params: PathParams | null;
  MatchedElement: JSX.Element;
} => {
  const { notFoundComponent, matchOnSubPath, transition = "fade" } =
    options || {};
  const location = useLocation();
  // `exact`, `sensitive` and `strict` options are set to true
  // to ensure type safety.
  const results = routes
    .map((route: TRoute): {
      route: TRoute;
      match: any | null;
    } => ({
      route,
      match: matchPath(location.pathname, {
        path: route.path,
        sensitive: !matchOnSubPath
      })
    }))
    .filter(({ match }) => !!match && (matchOnSubPath ? true : match.isExact));
  const [firstResult] = results;
  const { match, route } = firstResult || {};
  const Fallback = fallbackComponent;
  const NotFound = notFoundComponent || (() => <>not found</>);

  const Transition: React.FC<{ match: any }> = React.useMemo(() => {
    if (transition === "fade") {
      const FadeTransition: React.FC<{ match: any }> = ({
        children,
        match
      }) => (
        <Fade in={match ? true : false} timeout={300} unmountOnExit>
          <Box height={"100%"}>{children}</Box>
        </Fade>
      );

      return FadeTransition;
    }

    if (transition === "grow") {
      const GrowTransition: React.FC<{ match: any }> = ({
        children,
        match
      }) => (
        <Grow in={match ? true : false} timeout={300} unmountOnExit>
          <Box height={"100%"}>{children}</Box>
        </Grow>
      );

      return GrowTransition;
    }

    if (transition.startsWith("slide")) {
      const [, direction] = transition.split("-");
      const SlideTransition: React.FC<{ match: any }> = ({
        children,
        match
      }) => (
        <Slide
          in={match ? true : false}
          direction={direction as "left" | "right" | "up" | "down"}
          timeout={300}
          unmountOnExit
        >
          <Box height={"100%"}>{children}</Box>
        </Slide>
      );

      return SlideTransition;
    }
    return (({ children }) => children) as React.FC<{ match: any }>;
  }, [transition]);

  return {
    route: route,
    params:
      match && validateParams(route.path, match.params) ? match.params : {},
    MatchedElement: (
      <Switch>
        {matchOnSubPath &&
          routes.map(({ path, Component: RouteComponent }, i) => (
            <Route
              key={path + "matchOnSubPath"}
              path={`/${path.split("/").slice(1, 2)}/*`}
            >
              {({ match }) => (
                <Transition match={match}>
                  <RouteComponent />
                </Transition>
              )}
            </Route>
          ))}
        {routes.map(({ path, Component: RouteComponent }, i) => (
          <Route key={path + "root"} sensitive strict exact path={path}>
            {({ match }) => (
              <Transition match={match}>
                <RouteComponent />
              </Transition>
            )}
          </Route>
        ))}
        {Fallback && (
          <Transition match={true}>
            <Fallback />
          </Transition>
        )}
        {!Fallback && (
          <Transition match={true}>
            <Route component={NotFound} />
          </Transition>
        )}
      </Switch>
    )
  };
};

export default useMatchedRoute;
