import type {
  JSXAttribute,
  JSXElement,
  JSXExpression,
  JSXExpressionContainer,
  JSXSpreadAttribute,
  Literal,
  TemplateElement,
} from "@typescript-eslint/types/dist/generated/ast-spec";
import { ESLintUtils } from "@typescript-eslint/utils";
import * as path from "path";
import { createSyncFn } from "synckit";
import fs from "fs";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rule/${name}`
);

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
function getRemixAppConfig(filename: string) {
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

/**
 * Roughly behaves like path.resolve, except it returns undefined rather than
 * throw if it can't resolve the path
 */
function resolvePath(fromPath: string | undefined, toPath: string) {
  const isAbsolute = toPath.startsWith("/");
  if (!fromPath) return isAbsolute ? toPath : undefined; // not in a route, so we can't resolve a relative route 🤷‍♂️
  return path.resolve(fromPath, toPath);
}

// Convert it to a string path, using this simple heuristic...
// - If expressions are bounded by slashes, assume they represent a single dynamic path segment
// - If not, merge with adjacent segment(s) into a dynamic path segment
//   `foo/${bar}/lol` => "foo/:param/lol"
//   `foo/${bar}lol` => "foo/:param"
const EXPR_PLACEHOLDER = "__EXPR_PLACEHOLDER__";
const mergePattern = new RegExp(`[^/]*${EXPR_PLACEHOLDER}[^/]*`);
function stringifyTemplatePath(parts: TemplateElement[]) {
  const values = parts.map((p) => p.value.cooked);
  return values.join(EXPR_PLACEHOLDER).replace(mergePattern, ":param");
}

function getNodeStringValue(node: Literal | JSXExpression) {
  switch (node.type) {
    case "Literal":
      return getStringLiteralValue(node);
    case "JSXExpressionContainer":
      return getJSXExpressionStringValue(node);
  }
}

function getStringLiteralValue(node: Literal) {
  if (typeof node.value !== "string") return; // 🤷‍♂️
  return node.value;
}

function getJSXExpressionStringValue(node: JSXExpressionContainer) {
  const { expression } = node;
  switch (expression.type) {
    case "TemplateLiteral":
      const stringifiedPath = stringifyTemplatePath(expression.quasis);
      return stringifiedPath ?? undefined;
    case "Literal":
      return getStringLiteralValue(expression);
  }
}

function getAttributes(
  attributes: (JSXAttribute | JSXSpreadAttribute)[],
  names: readonly string[]
) {
  return attributes.filter(
    (a) => a.type === "JSXAttribute" && names.includes(a.name.name as string)
  ) as JSXAttribute[];
}

const RoutingComponentAttributeMap = {
  Link: ["to"],
  NavLink: ["to"],
  Form: ["action"],
} as const;

type RuleContext = {
  getFilename(): string;
  getCwd?(): string;
};
function getRemixContext(context: RuleContext) {
  const filename = path.relative(
    context.getCwd?.() ?? process.cwd(),
    context.getFilename()
  );
  const appConfig = getRemixAppConfig(filename);
  const currentRoutePath = appConfig
    ? findRoutePathByFilename(filename, appConfig)
    : undefined;
  return { appConfig, currentRoutePath };
}

type ValuedAttribute = JSXAttribute & { value: Literal | JSXExpression };

/**
 * If this is a routing-aware element (e.g. <Link>), resolve any path-y
 * attributes (e.g. `to`) and their string values, and run the callback
 */
function eachRoutePathAttribute(
  node: JSXElement,
  cb: (data: {
    componentName: string;
    attribute: ValuedAttribute;
    value: string;
  }) => void
) {
  if (node.openingElement.name.type !== "JSXIdentifier") return;
  const {
    attributes,
    name: { name: componentName },
  } = node.openingElement;
  const attributeNames =
    RoutingComponentAttributeMap[
      componentName as keyof typeof RoutingComponentAttributeMap
    ] || [];
  const attrs = getAttributes(attributes, attributeNames);
  for (const attribute of attrs) {
    if (!attribute.value) continue;
    const value = getNodeStringValue(attribute.value);
    if (!value) continue;
    cb({ componentName, attribute: attribute as ValuedAttribute, value });
  }
}

export const rules = {
  "no-ambiguous-paths": createRule({
    create(context) {
      const { appConfig, currentRoutePath } = getRemixContext(context);
      if (!appConfig) return {}; // Not in a remix app, so 🤷‍♂️
      if (currentRoutePath) return {}; // If we're inside a route, we can resolve relative paths, so we're all good
      // TODO: though consider linting full-stack components exported from a route module 🤔

      return {
        JSXElement(node) {
          eachRoutePathAttribute(
            node,
            ({
              componentName,
              value: toPath,
              attribute: {
                value: { loc },
              },
            }) => {
              if (resolvePath(currentRoutePath, toPath)) return;
              context.report({
                messageId: "ambiguousPath",
                loc,
                data: {
                  toPath,
                  componentName,
                },
              });
            }
          );
        },
      };
    },
    name: "no-ambiguous-paths",
    meta: {
      docs: {
        description:
          "Ensure <Link> and friends have explicit paths when used outside of a route.",
        recommended: "warn",
      },
      messages: {
        ambiguousPath:
          'Ambiguous route path "{{toPath}}". Specify absolute paths when using `<{{componentName}}>` outside of a route.',
      },
      type: "suggestion",
      schema: [],
    },
    defaultOptions: [],
  }),

  "require-valid-paths": createRule({
    create(context) {
      const { appConfig, currentRoutePath } = getRemixContext(context);
      if (!appConfig) return {}; // Not in a remix app, so 🤷‍♂️

      return {
        JSXElement(node) {
          eachRoutePathAttribute(
            node,
            ({
              value: toPath,
              attribute: {
                value: { loc },
              },
            }) => {
              const toPathNormalized = resolvePath(currentRoutePath, toPath);
              if (
                toPathNormalized &&
                !validateRoute(appConfig.routes, toPathNormalized)
              ) {
                context.report({
                  messageId: "invalidPath",
                  loc,
                  data: { toPathNormalized },
                });
              }
            }
          );
        },
      };
    },
    name: "require-valid-paths",
    meta: {
      docs: {
        description:
          "Ensure <Link> and friends point to actual routes in the app.",
        recommended: "error",
      },
      messages: {
        invalidPath:
          'No route matches "{{toPathNormalized}}". Either create one, or point to a valid route.',
      },
      type: "suggestion",
      schema: [],
    },
    defaultOptions: [],
  }),
};
