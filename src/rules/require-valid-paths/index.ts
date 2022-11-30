import { getRemixContext } from "../../remixContext";
import { eachRoutePathAttribute } from "../../ast";
import {
  createRule,
  isAUri,
  resolvePath,
  RoutingComponentAttributes,
} from "../common";

export default createRule({
  create(context) {
    const { appConfig, currentRoutePath, validateRoute } =
      getRemixContext(context);
    if (!appConfig) return {}; // Not in a Remix app or there was an error, so 🤷‍♂️

    return {
      JSXElement(node) {
        eachRoutePathAttribute(
          node,
          RoutingComponentAttributes,
          ({ nativeAlternative, value: toPath, loc }) => {
            const toPathNormalized = resolvePath(currentRoutePath, toPath);
            if (!toPathNormalized) return; // if we can't resolve a relative path, we defer to no-ambiguous-paths
            if (validateRoute(toPathNormalized)) return; // yay
            return context.report({
              messageId: isAUri(toPath) ? "urlAsPath" : "invalidPath",
              loc,
              data: { toPathNormalized, nativeAlternative },
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
      urlAsPath: `No route matches "{{toPathNormalized}}". If you're trying to reference a URL, consider using \`{{nativeAlternative}}\` instead.`,
      invalidPath:
        'No route matches "{{toPathNormalized}}". Either create one, or point to a valid route.',
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});
