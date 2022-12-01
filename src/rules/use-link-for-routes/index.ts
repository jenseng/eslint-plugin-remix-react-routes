import { eachRoutePathAttribute } from "../../ast";
import { createRule, isAUri } from "../common";

export default createRule({
  create(context) {
    return {
      JSXElement(node) {
        eachRoutePathAttribute(
          node,
          [{ component: "a", attribute: "href" }],
          ({ value: toPath, loc }) => {
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
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});
