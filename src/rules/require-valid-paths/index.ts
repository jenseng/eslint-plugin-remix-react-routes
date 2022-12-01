import { getRemixContext } from "../../remixContext";
import { forEachStringAttribute } from "../../ast";
import {
  createRule,
  isAUri,
  resolvePath,
  RoutingComponentAttributeMatchers,
} from "../common";

export default createRule({
  create(context) {
    const { appConfig, currentRoutePath, validateRoute } =
      getRemixContext(context);
    if (!appConfig) return {}; // Not in a Remix app or there was an error, so 🤷‍♂️

    return {
      JSXElement(node) {
        forEachStringAttribute(
          node,
          RoutingComponentAttributeMatchers,
          ({ value: toPath, loc }) => {
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
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});
