import * as path from "path";
import { getRemixAppConfig, JsonFormattedRoute } from "./appConfig";
import { RuleContext } from "@typescript-eslint/utils/dist/ts-eslint";

type RemixAppConfig = {
  appDirectory: string;
  routes: JsonFormattedRoute[];
};

// TODO: consider detecting other watch flavors
const watchForChanges = isRunningInVSCodeServer();

function isRunningInVSCodeServer() {
  // TODO: find a more reliable way to detect this 🙃😬😅
  return process.exit.toString().includes("ExitCalled.type");
}

/**
 * Determine whether or not the given route path is valid
 *
 * @param routes routes tree
 * @param routePath path to validate
 */
// TODO: see if we can leverage matchRoutes
function validateRoute(routes: JsonFormattedRoute[], routePath: string) {
  if (!routePath.startsWith("/")) throw new Error("Path must be absolute");
  return _validateRouteParts(routePath.substring(1).split("/"), routes);
}

function _validateRouteParts(
  parts: string[],
  routes: JsonFormattedRoute[]
): boolean {
  if (parts.length === 0) return true;
  return routes.some((route) => {
    // we're at the end and we hit an index route
    if (parts.length === 1 && parts[0] === "" && route.index) return true;
    // pathless route, let's dive in
    if (!route.path) return _validateRouteParts(parts, route.children ?? []);
    const routeParts = route.path.split("/");
    // splat, ignore the remainder
    if (routeParts[routeParts.length - 1] === "*") return true;
    // otherwise these segments match the current route path exactly, or it's dynamic
    return (
      routeParts.every((rp, i) => rp === parts[i] || rp.startsWith(":")) &&
      _validateRouteParts(parts.slice(routeParts.length), route.children ?? [])
    );
  });
}

/**
 * Return the route path corresponding to this filename (either via convention or config),
 * or undefined if the filename doesn't represent a route module
 *
 * @param filename absolute file path
 * @param config remix app config
 */
function findRoutePathByFilename(
  filename: string,
  { appDirectory, routes }: RemixAppConfig
): string | undefined {
  const relativeFilename = path.relative(appDirectory, filename);
  return _findRoutePathByFilename(relativeFilename, routes);
}

function _findRoutePathByFilename(
  filename: string,
  routes: JsonFormattedRoute[],
  pathParts: string[] = []
): string | undefined {
  for (const route of routes) {
    if (filename === route.file) {
      return (
        "/" + (route.path ? [...pathParts, route.path] : pathParts).join("/")
      );
    } else if (route.id === "root" || filename.startsWith(route.id)) {
      return _findRoutePathByFilename(
        filename,
        route.children ?? [],
        route.path ? [...pathParts, route.path] : pathParts
      );
    }
  }
}

export type RemixContext = {
  appConfig?: RemixAppConfig;
  currentRoutePath?: string;
  validateRoute: (routePath: string) => boolean;
};
/**
 * Get the Remix context based on the current ESLint rule context
 */
export function getRemixContext<
  TMessageIds extends string,
  TOptions extends readonly unknown[]
>(
  context: Pick<RuleContext<TMessageIds, TOptions>, "settings" | "getFilename">
): RemixContext {
  if (context.settings?.remixReactRoutes?.mockRemixContext) {
    return {
      validateRoute: () => true,
      ...context.settings?.remixReactRoutes?.mockRemixContext,
    };
  }

  const filename = context.getFilename();
  let appConfig: RemixAppConfig | undefined;
  try {
    appConfig = getRemixAppConfig(filename, watchForChanges);
  } catch (e) {
    console.warn(
      `Error loading Remix config, remix-react-routes rules will be skipped:`,
      e
    );
  }
  const currentRoutePath = appConfig
    ? findRoutePathByFilename(filename, appConfig)
    : undefined;
  return {
    appConfig,
    currentRoutePath,
    validateRoute: (routePath: string) =>
      validateRoute(appConfig?.routes ?? [], routePath),
  };
}
