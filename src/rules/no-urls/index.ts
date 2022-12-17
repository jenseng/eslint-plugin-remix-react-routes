import {
  buildResolveType,
  forEachStringAttribute,
  getPathValue,
} from "../../ast";
import {
  createRule,
  isAUri,
  RoutingComponentAttributeMatchers,
} from "../common";

export default createRule({
  create(context) {
    const resolveType = buildResolveType(context);
    return {
      JSXElement(node) {
        forEachStringAttribute(
          node,
          resolveType,
          RoutingComponentAttributeMatchers,
          ({ nativeAlternative, value, component, attribute, loc }) => {
            const toPath = getPathValue(value ?? "");
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
