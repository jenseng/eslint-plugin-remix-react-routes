import { eachRoutePathAttribute } from "../../ast";
import { createRule, isAUri, RoutingComponentAttributes } from "../common";

export default createRule({
  create(context) {
    return {
      JSXElement(node) {
        eachRoutePathAttribute(
          node,
          RoutingComponentAttributes,
          ({ nativeAlternative, value: toPath, component, attribute, loc }) => {
            if (!isAUri(toPath)) return; // defer to no-relative-paths and require-valid-paths
            return context.report({
              messageId: "urlAsPath",
              loc,
              data: { component, attribute, nativeAlternative },
            });
          }
        );
      },
    };
  },
  name: "no-urls",
  meta: {
    docs: {
      description: "Ensure <Link> and friends use paths rather than URLs.",
      recommended: "error",
    },
    messages: {
      urlAsPath: `\`<{{component}} {{attribute}}>\` does not support URLs, only paths. Consider using \`{{nativeAlternative}}\` instead.`,
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});
