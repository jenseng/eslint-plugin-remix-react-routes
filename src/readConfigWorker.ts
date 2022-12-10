import { runAsWorker } from "synckit";
import { readConfig } from "./remix/remixShim";

runAsWorker(async (projectPath) => {
  // TODO: come up with something less hacky; here we rely on the fact that
  // Remix uses `require` in test mode (rather than `import`), and we can
  // reset the require cache to ensure we get a fresh config. This is really
  // only needed in watch scenarios (e.g. VSCode ESLint server)
  process.env.NODE_ENV = "test";
  for (const key in require.cache) {
    if (key.startsWith(projectPath)) delete require.cache[key];
  }
  const { routes, appDirectory } = await readConfig(projectPath);
  return { routes, appDirectory };
});
