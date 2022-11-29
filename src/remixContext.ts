import * as path from "path";
import { createSyncFn } from "synckit";
import fs from "fs";

type RemixAppConfig = {
  appDirectory: string;
  routes: JsonFormattedRoute[];
};
type JsonFormattedRoute = {
  id: string;
  index?: boolean;
  path?: string;
  caseSensitive?: boolean;
  file: string;
  children?: JsonFormattedRoute[];
};

const remixApps: {
  [projectPath: string]: RemixAppConfig;
} = {};

/**
 * Synchronously run Remix' async readConfig using a worker thread
 *
 * Why you might ask? ESLint really likes things to be synchronous 🫠
 */
const readConfig = createSyncFn(path.resolve(__dirname, "readConfig.js"));

function loadAppConfig(projectPath: string) {
  remixApps[projectPath] = readConfig(projectPath);
  return remixApps[projectPath];
}

/**
 * Return the remix app config for this file (iff it's in a Remix app)
 *
 * @param filename absolute file path
 */
export function getRemixAppConfig(filename: string) {
  // if we already found one above us somewhere, it's a cheap lookup
  for (const projectPath in remixApps) {
    if (filename.startsWith(projectPath)) return remixApps[projectPath];
  }
  // otherwise start looking
  return _maybeFindRemixAppConfig(filename);
}

const configExts = [".js", ".cjs", ".mjs"];
const visited = new Map<string, boolean>();
function _maybeFindRemixAppConfig(filename: string) {
  const dir = path.dirname(filename);
  if (dir === filename) return; // root, nope
  if (visited.has(dir)) return; // someone else has been here, nope
  for (const ext of configExts) {
    const file = path.resolve(dir, "remix.config" + ext);
    if (fs.existsSync(file)) {
      // TODO: detect eslint watch mode, as well as IDE server, etc, and start watching route paths so we know when to reload this
      return loadAppConfig(dir);
    }
  }
  visited.set(dir, true);
  _maybeFindRemixAppConfig(dir);
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

type RuleContext = {
  getFilename(): string;
  getCwd?(): string;
};
/**
 * Get the Remix context based on the current ESLint rule context
 */
export function getRemixContext(context: RuleContext) {
  const filename = path.relative(
    context.getCwd?.() ?? process.cwd(),
    context.getFilename()
  );
  const appConfig = getRemixAppConfig(filename);
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
