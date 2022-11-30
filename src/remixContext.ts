import * as path from "path";
import { createSyncFn } from "synckit";
import fs from "fs";
import * as chokidar from "chokidar";
import { formatRoutesAsJson } from "@remix-run/dev/dist/config/format";

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

process.env.DEBUG = "1";
const remixApps: {
  [projectPath: string]: RemixAppConfig;
} = {};

// TODO: consider detecting other watch flavors
const watchForChanges = isRunningInVSCodeServer();

const configBase = "remix.config";
const configExts = [".js", ".cjs", ".mjs"];

const _watchers: Record<string, () => void> = {};

// watch this Remix app for any changes affecting its config
function watchRemixAppConfig(
  projectPath: string,
  appConfig: RemixAppConfig,
  recreate: boolean
) {
  if (_watchers[projectPath] && !recreate) return;

  debug(`${recreate ? "recreating" : "creating"} watcher for ${projectPath}`);
  _watchers[projectPath]?.();

  let ready = false;
  let active = true;
  const routesDir = path.join(appConfig.appDirectory, "routes");
  const watcher = chokidar.watch([
    path.join(projectPath, `${configBase}{${configExts.join(",")}}`),
    routesDir,
    // TODO: additional user-defined paths which may affect the config
  ]);

  watcher.on("ready", () => (ready = true));
  watcher.on("add", (changedPath) => {
    if (!ready || !active) return;
    debug(`added ${changedPath}`);
    loadAppConfig(projectPath);
  });
  watcher.on("unlink", (changedPath) => {
    if (!ready || !active) return;
    debug(`removed ${changedPath}`);
    loadAppConfig(projectPath);
  });
  watcher.on("change", (changedPath) => {
    if (!ready || !active || changedPath.startsWith(routesDir)) return;
    debug(`changed ${changedPath}`);
    try {
      loadAppConfig(projectPath, true);
    } catch (e) {
      console.error(e);
    }
  });

  _watchers[projectPath] = () => {
    active = false;
    watcher.close();
  };
}

function isRunningInVSCodeServer() {
  // TODO: find a more reliable way to detect this 🙃😬😅
  return process.exit.toString().includes("ExitCalled.type");
}

function debug(...values: string[]) {
  if (process.env.DEBUG) values.forEach((value) => console.warn(value));
}

/**
 * Synchronously run Remix' async readConfig using a worker thread
 *
 * Why you might ask? ESLint really likes things to be synchronous 🫠
 */
const readConfigSync = createSyncFn(path.resolve(__dirname, "readConfig.js"));

function loadAppConfig(projectPath: string, recreateWatcher = false) {
  const appConfig = readConfigSync(projectPath);
  appConfig.routes = JSON.parse(formatRoutesAsJson(appConfig.routes));
  if (watchForChanges)
    watchRemixAppConfig(projectPath, appConfig, recreateWatcher);
  debug("loaded app config", JSON.stringify(appConfig, null, 2));
  return (remixApps[projectPath] = appConfig);
}

/**
 * Return the Remix app config for this file (iff it's in a Remix app)
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

const visited = new Map<string, boolean>();
function _maybeFindRemixAppConfig(filename: string) {
  const dir = path.dirname(filename);
  if (dir === filename) return; // root, nope
  if (visited.has(dir)) return; // someone else has been here, nope
  try {
    for (const ext of configExts) {
      const file = path.resolve(dir, configBase + ext);
      if (fs.existsSync(file)) {
        return loadAppConfig(dir);
      }
    }
  } finally {
    visited.set(dir, true);
  }
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
  const filename = context.getFilename();
  let appConfig: RemixAppConfig | undefined;
  try {
    appConfig = getRemixAppConfig(filename);
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
