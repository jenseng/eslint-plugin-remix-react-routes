import {
  readFileSync,
  writeFileSync as writeFile,
  realpathSync as realpath,
  mkdtempSync as mkdtemp,
  mkdirSync as mkdir,
  copySync as cp,
  existsSync as exists,
  removeSync as rmrf,
} from "fs-extra";
import { homedir, tmpdir } from "os";
import { dirname, join, relative, resolve } from "path";
import { spawnSync } from "child_process";

const pluginPath = resolve(__dirname, "..");
const cacheDir = process.env.CI
  ? resolve(homedir(), ".npm", "_cache", "remix-react-routes") // piggy back on CI npm caching
  : resolve(pluginPath, ".cache");

function readFile(path: string) {
  return readFileSync(path, "utf8");
}

function exec(cmd: string, cwd = process.cwd()) {
  const result = spawnSync("bash", ["-c", cmd], {
    cwd,
    encoding: "utf8",
  });
  if (result.status === 0) return result.stdout;
  if (result.error) throw result.error;
  process.stderr.write(result.stderr);
  throw new Error(`command failed with status ${result.status}`);
}

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

type App = {
  lint(): Record<string, string[]>;
};

interface AppFactory {
  (options: { files: Record<string, string> }): App;
  cleanup(): void;
}

function prepareAppFactoryTemplateDirectory(remixVersion: string) {
  const directory = join(cacheDir, `app-factory-template-${remixVersion}`);
  if (!exists(directory)) {
    log(`Setting up template for ${remixVersion}...`);
    mkdir(directory, { recursive: true });
    exec(
      `npx create-remix@latest --no-install --typescript --template remix --remix-version ${remixVersion} .`,
      directory
    );
    // hard pin the remix version
    const packagePath = join(directory, "package.json");
    writeFile(
      packagePath,
      readFile(packagePath).replace(/("@remix-run\/[^"]+": ")\^/g, "$1")
    );
    writeFile(join(directory, ".npmrc"), "registry=https://registry.npmjs.org");
  } else {
    log(`Using existing template for ${remixVersion}...`);
  }
  return directory;
}

function installAppFactoryDependencies(
  baseDir: string,
  templateDirectory: string
) {
  log(`Installing app dependencies...`);
  cp(join(templateDirectory, "package.json"), join(baseDir, "package.json"));
  cp(join(templateDirectory, ".npmrc"), join(baseDir, ".npmrc"));
  exec("npm install", baseDir);
  exec(`npm pack --pack-destination ${baseDir}`, pluginPath);
  exec(
    `npm install @typescript-eslint/parser ./eslint-plugin-remix-react-routes*.tgz`,
    baseDir
  );
}

export function buildAppFactory(remixVersion: string): AppFactory {
  if (remixVersion === "latest") {
    remixVersion = exec("npm view @remix-run/dev version").trim();
  }
  const templateDirectory = prepareAppFactoryTemplateDirectory(remixVersion);

  // install all deps in the factory base dir; apps will be created underneath this
  let baseDir = realpath(
    mkdtemp(join(tmpdir(), "eslint-plugin-remix-react-routes--app-factory-"))
  );
  installAppFactoryDependencies(baseDir, templateDirectory);

  let appIndex = 0;
  const factory: AppFactory = ({ files }) => {
    let appDir = join(baseDir, `app-${appIndex++}`);
    mkdir(appDir);
    cp(templateDirectory, appDir);
    prepareAppFiles(appDir, files);
    log("App factory ready!");
    return {
      lint() {
        return lint(appDir);
      },
    };
  };
  factory.cleanup = () => rmrf(baseDir);
  return factory;
}

function lint(cwd: string) {
  const output = exec(
    "../node_modules/.bin/eslint 'app/**/*.tsx' --format json || :",
    cwd
  );
  const results = JSON.parse(output) as {
    filePath: string;
    messages: [{ ruleId: string; messageId: string }];
  }[];
  return Object.fromEntries(
    results.map(({ filePath, messages }) => [
      relative(cwd, filePath),
      messages.map(({ ruleId, messageId }) => `${ruleId}:${messageId}`).sort(),
    ])
  );
}

function prepareAppFiles(directory: string, files: Record<string, string>) {
  log(`Preparing app files...`);
  for (const [filePath, fileContents] of Object.entries(files)) {
    mkdir(join(directory, dirname(filePath)), {
      recursive: true,
    });
    writeFile(join(directory, filePath), fileContents);
  }
}
