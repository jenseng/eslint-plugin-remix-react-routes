import * as path from "path";
import fs from "fs";
import * as chokidar from "chokidar";
import { formatRoutesAsJson } from "./remixShim";
import { readConfigSync } from "../readConfigSync";

type RemixAppConfig = {
  appDirectory: string;
  routes: JsonFormattedRoute[];
};
export type JsonFormattedRoute = {
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
    loadAppConfig(projectPath, true);
  });
  watcher.on("unlink", (changedPath) => {
    if (!ready || !active) return;
    debug(`removed ${changedPath}`);
    loadAppConfig(projectPath, true);
  });
  watcher.on("change", (changedPath) => {
    if (!ready || !active || changedPath.startsWith(routesDir)) return;
    debug(`changed ${changedPath}`);
    try {
      loadAppConfig(projectPath, true, true);
    } catch (e) {
      console.error(e);
    }
  });

  _watchers[projectPath] = () => {
    active = false;
    watcher.close();
  };
}

function debug(...values: string[]) {
  if (process.env.DEBUG) values.forEach((value) => console.warn(value));
}

function loadAppConfig(
  projectPath: string,
  watchForChanges: boolean,
  recreateWatcher = false
): RemixAppConfig {
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
export function getRemixAppConfig(filename: string, watchForChanges = false) {
  // if we already found one above us somewhere, it's a cheap lookup
  for (const projectPath in remixApps) {
    if (filename.startsWith(projectPath)) return remixApps[projectPath];
  }
  // otherwise start looking
  return _maybeFindRemixAppConfig(filename, watchForChanges);
}

const visited = new Map<string, boolean>();
function _maybeFindRemixAppConfig(
  filename: string,
  watchForChanges: boolean
): RemixAppConfig | undefined {
  const dir = path.dirname(filename);
  if (dir === filename) return; // root, nope
  if (visited.has(dir)) return; // someone else has been here, nope
  try {
    for (const ext of configExts) {
      const file = path.resolve(dir, configBase + ext);
      if (fs.existsSync(file)) {
        return loadAppConfig(dir, watchForChanges);
      }
    }
  } finally {
    visited.set(dir, true);
  }
  return _maybeFindRemixAppConfig(dir, watchForChanges);
}
