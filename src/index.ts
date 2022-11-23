import type {
  JSXAttribute,
  JSXExpression,
  JSXExpressionContainer,
  JSXSpreadAttribute,
  Literal,
  TemplateElement,
} from "@typescript-eslint/types/dist/generated/ast-spec";
import { ESLintUtils } from "@typescript-eslint/utils";
import * as globby from "globby";
import * as path from "path";
import { createSyncFn } from "synckit";

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

const readConfig = createSyncFn(path.resolve(__dirname, "readConfig.js"));

const projectPaths = globby
  .sync("**/remix.config.{js,cjs,mjs}", {
    gitignore: true,
  })
  .map((dir) => path.dirname(dir) + "/");
for (const projectPath of projectPaths) {
  refreshAppConfig(projectPath);
}

// TODO: detect eslint watch mode, as well as IDE server, etc, and start watching route paths

function refreshAppConfig(projectPath: string) {
  try {
    remixApps[projectPath] = readConfig(projectPath);
  } catch (error) {
    console.error(error);
  }
}

function getRemixAppConfig(filename: string) {
  for (const projectPath in remixApps) {
    if (filename.startsWith(projectPath)) return remixApps[projectPath];
  }
}

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

function normalizePath(toPath: string, fromPath: string | undefined) {
  const isAbsolute = toPath.startsWith("/");
  if (!isAbsolute && !fromPath) return; // not in a route, so we can't resolve a relative route 🤷‍♂️
  return isAbsolute ? toPath : path.normalize(`${fromPath}/${toPath}`);
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

function getPathValue(node: Literal | JSXExpression) {
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

export const rules = {
  "validate-paths": createRule({
    create(context) {
      const filename = path.relative(process.cwd(), context.getFilename());
      const appConfig = getRemixAppConfig(filename);
      if (!appConfig) return {}; // Not in a remix app, so 🤷‍♂️

      return {
        JSXElement(node) {
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
          for (const attr of attrs) {
            if (!attr.value) continue;
            const toPath = getPathValue(attr.value);
            if (!toPath) continue;
            const fromPath = findRoutePathByFilename(filename, appConfig);
            const toPathNormalized = normalizePath(toPath, fromPath);
            if (!toPathNormalized) {
              context.report({
                messageId: "ambiguousPath",
                loc: attr.value.loc,
                data: {
                  toPath,
                  toPathNormalized,
                  componentName,
                },
              });
            } else if (!validateRoute(appConfig.routes, toPathNormalized)) {
              context.report({
                messageId: "invalidPath",
                loc: attr.value.loc,
                data: {
                  toPath,
                  toPathNormalized,
                  componentName,
                },
              });
            }
          }
        },
      };
    },
    name: "validate-paths",
    meta: {
      docs: {
        description:
          "Ensure <Link> and friends point to actual routes in the app.",
        recommended: "warn",
      },
      messages: {
        invalidPath:
          'No route matches "{{toPathNormalized}}". Either create one, or point to a valid route.',
        ambiguousPath:
          'Ambiguous route path "{{toPath}}". Specify absolute paths when using `<{{componentName}}>` outside of a route.',
      },
      type: "suggestion",
      schema: [],
    },
    defaultOptions: [],
  }),
};
