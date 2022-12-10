import * as path from "path";
import { createSyncFn } from "synckit";

/**
 * Synchronously run Remix' async readConfig using a worker thread
 *
 * Why you might ask? ESLint really likes things to be synchronous 🫠
 */
export const readConfigSync = createSyncFn(
  path.join(__dirname, "./readConfigWorker.js")
);
