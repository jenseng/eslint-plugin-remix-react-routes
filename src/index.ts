import { ESLintUtils } from "@typescript-eslint/utils";
import * as path from "path";
import { eachRoutePathAttribute } from "./ast";
import { getRemixContext } from "./remixContext";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rule/${name}`
);

/**
 * Roughly behaves like path.resolve, except it returns undefined rather than
 * throw if it can't resolve the path
 */
function resolvePath(fromPath: string | undefined, toPath: string) {
  const isAbsolute = toPath.startsWith("/");
  if (!fromPath) return isAbsolute ? toPath : undefined; // not in a route, so we can't resolve a relative route 🤷‍♂️
  return path.resolve(fromPath, toPath);
}

const RoutingComponentAttributeMap = {
  Link: ["to"],
  NavLink: ["to"],
  Form: ["action"],
} as const;

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
            RoutingComponentAttributeMap,
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
      const { appConfig, currentRoutePath, validateRoute } =
        getRemixContext(context);
      if (!appConfig) return {}; // Not in a remix app, so 🤷‍♂️

      return {
        JSXElement(node) {
          eachRoutePathAttribute(
            node,
            RoutingComponentAttributeMap,
            ({
              value: toPath,
              attribute: {
                value: { loc },
              },
            }) => {
              const toPathNormalized = resolvePath(currentRoutePath, toPath);
              if (toPathNormalized && !validateRoute(toPathNormalized)) {
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
