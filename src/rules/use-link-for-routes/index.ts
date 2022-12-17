import {
  buildResolveType,
  forEachStringAttribute,
  getPathValue,
} from "../../ast";
import { createRule, isAUri } from "../common";

export default createRule<[], "anchorForRoute" | "indeterminateUrl">({
  create(context) {
    const resolveType = buildResolveType(context);
    return {
      JSXElement(node) {
        forEachStringAttribute(
          node,
          resolveType,
          [{ component: "a", attribute: "href" }],
          ({ value, loc }) => {
            if (value === null) {
              if (context.settings.remixReactRoutes?.strictMode)
                context.report({
                  messageId: "indeterminateUrl",
                  loc,
                });
              return;
            }
            const toPath = getPathValue(value ?? "");
            if (isAUri(toPath)) return; // this is what <a href> is for
            return context.report({ messageId: "anchorForRoute", loc });
          }
        );
      },
    };
  },
  name: "use-link-for-routes",
  meta: {
    docs: {
      description:
        "Ensure routes are linked via <Link to> rather than <a href>",
      recommended: "error",
    },
    messages: {
      anchorForRoute:
        "Use `<Link to>` when linking within the app. If you want for force a full page load, use `<Link to=... reloadDocument>`.",
      indeterminateUrl:
        "Unable to resolve URL statically. Consider providing a constant value.",
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});
