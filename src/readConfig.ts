import { runAsWorker } from "synckit";
import { readConfig } from "@remix-run/dev/dist/config";
import { formatRoutesAsJson } from "@remix-run/dev/dist/config/format";

runAsWorker(async (projectPath) => {
  const { routes, appDirectory } = await readConfig(projectPath);
  return { routes: JSON.parse(formatRoutesAsJson(routes)), appDirectory };
});
