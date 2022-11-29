import { ESLintUtils } from "@typescript-eslint/utils";
import { eachRoutePathAttribute } from "./ast";
import { getRemixContext } from "./remixContext";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rule/${name}`
);

/**
 * Roughly behaves like path.resolve, except it 1. doesn't remove repeating slashes and 2. returns undefined rather than
 * throw if it can't resolve the path
 */
function resolvePath(fromPath: string | undefined, toPath: string) {
  const isAbsolute = toPath.startsWith("/");
  if (isAbsolute) return toPath;
  if (!fromPath) return undefined; // can't resolve a relative path if we don't know where we are 🤷‍♂️
  const parts = `${fromPath}/${toPath}`.split("/");
  const result: string[] = [];
  for (const part of parts) {
    if (part === "..") result.pop();
    else if (part !== ".") result.push(part);
  }
  return result.join("/");
}

// TODO: perhaps make this configurable if users want to lint other components/attributes
const RoutingComponentAttributes = [
  { component: "Link", attribute: "to", nativeAlternative: "<a href>" },
  { component: "NavLink", attribute: "to", nativeAlternative: "<a href>" },
  {
    component: "Form",
    attribute: "action",
    nativeAlternative: "<form action>",
  },
];

const IS_A_URI = /^(\w+:)?\/\//;

export const rules = {
  "no-ambiguous-paths": createRule({
    create(context) {
      const { appConfig, currentRoutePath } = getRemixContext(context);
      if (!appConfig) return {}; // Not in a remix app or there was an error, so 🤷‍♂️
      if (currentRoutePath) return {}; // If we're inside a route, we can resolve relative paths, so we're all good
      // TODO: though consider linting full-stack components exported from a route module 🤔

      return {
        JSXElement(node) {
          eachRoutePathAttribute(
            node,
            RoutingComponentAttributes,
            ({ component, attribute, value: toPath, loc }) => {
              if (resolvePath(currentRoutePath, toPath)) return;
              context.report({
                messageId: "ambiguousPath",
                loc,
                data: {
                  toPath,
                  component,
                  attribute,
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
          'Ambiguous route path "{{toPath}}". Specify absolute paths when using `<{{component}} {{attribute}}>` outside of a route.',
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
      if (!appConfig) return {}; // Not in a remix app or there was an error, so 🤷‍♂️

      return {
        JSXElement(node) {
          eachRoutePathAttribute(
            node,
            RoutingComponentAttributes,
            ({ nativeAlternative, value: toPath, loc }) => {
              const looksLikeAUrl = toPath.match(IS_A_URI);
              const toPathNormalized = resolvePath(currentRoutePath, toPath);
              // if we can't normalize a relative path, we generally defer to no-ambiguous-paths...
              if (toPathNormalized) {
                if (validateRoute(toPathNormalized)) return;
                if (!looksLikeAUrl)
                  return context.report({
                    messageId: "invalidPath",
                    loc,
                    data: { toPathNormalized },
                  });
              }
              // ... unless it looks like a URL in which case we still complain here
              if (looksLikeAUrl) {
                context.report({
                  messageId: "urlAsPath",
                  loc,
                  data: { toPathNormalized, nativeAlternative },
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
        urlAsPath: `No route matches "{{toPathNormalized}}". If you're trying to reference a URL, consider using \`{{nativeAlternative}}\` instead.`,
        invalidPath:
          'No route matches "{{toPathNormalized}}". Either create one, or point to a valid route.',
      },
      type: "suggestion",
      schema: [],
    },
    defaultOptions: [],
  }),
};
