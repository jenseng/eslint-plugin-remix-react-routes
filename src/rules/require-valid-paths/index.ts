import { getRemixContext } from "../../remix";
import {
  buildResolveType,
  forEachStringAttribute,
  getPathValue,
} from "../../ast";
import {
  createRule,
  isAUri,
  resolvePath,
  RoutingComponentAttributeMatchers,
} from "../common";

export default createRule<[], "invalidPath" | "indeterminatePath">({
  create(context) {
    const resolveType = buildResolveType(context);
    const { appConfig, currentRoutePath, validateRoute } =
      getRemixContext(context);
    if (!appConfig) return {}; // Not in a Remix app or there was an error, so 🤷‍♂️

    return {
      JSXElement(node) {
        forEachStringAttribute(
          node,
          resolveType,
          RoutingComponentAttributeMatchers,
          ({ value, loc }) => {
            if (value === null) {
              if (context.settings.remixReactRoutes?.strictMode)
                context.report({
                  messageId: "indeterminatePath",
                  loc,
                });
              return; // we don't know what it is, but we don't care 🤷‍♂️
            }
            const toPath = getPathValue(value ?? "");
            const toPathNormalized = resolvePath(currentRoutePath, toPath);
            if (!toPathNormalized) return; // if we can't resolve a relative path, we defer to no-relative-paths
            if (isAUri(toPath)) return; // defer to no-urls
            if (validateRoute(toPathNormalized)) return; // yay
            return context.report({
              messageId: "invalidPath",
              loc,
              data: { toPathNormalized },
            });
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
      indeterminatePath:
        "Unable to resolve route path statically. Consider providing a constant value.",
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});
