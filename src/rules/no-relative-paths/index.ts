import { getRemixContext } from "../../remix";
import {
  buildResolveType,
  forEachStringAttribute,
  getPathValue,
} from "../../ast";
import {
  createRule,
  isAbsolute,
  isAUri,
  RoutingComponentAttributeMatchers,
} from "../common";
import path from "path";

type Options = [
  {
    enforceInRouteComponents?: boolean;
    allowLinksToSelf?: boolean;
  }
];
const defaultOptions = {
  enforceInRouteComponents: false,
  allowLinksToSelf: true,
} as const;

export default createRule<Options, "relativePath" | "ambiguousPath">({
  create(context) {
    const resolveType = buildResolveType(context);
    const { currentRoutePath } = getRemixContext(context);
    const options = { ...defaultOptions, ...(context.options[0] ?? {}) };

    // If we're inside a route, we can resolve relative paths, so bail if the options allow it
    if (currentRoutePath && !options.enforceInRouteComponents) return {};

    // TODO: though consider linting full-stack components exported from a route module 🤔

    return {
      JSXElement(node) {
        forEachStringAttribute(
          node,
          resolveType,
          RoutingComponentAttributeMatchers,
          ({ component, attribute, value, loc }) => {
            const toPath = getPathValue(value ?? "");
            if (isAbsolute(toPath)) return;
            if (isAUri(toPath)) return; // defer to no-urls
            if (options.allowLinksToSelf && path.relative(".", toPath) === "")
              return;

            context.report({
              messageId: currentRoutePath ? "relativePath" : "ambiguousPath",
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
  name: "no-relative-paths",
  meta: {
    docs: {
      description:
        "Ensure <Link> and friends have absolute paths when used outside of a route.",
      recommended: "error",
    },
    messages: {
      relativePath:
        'Relative route path "{{toPath}}". Specify absolute paths when using `<{{component}} {{attribute}}>`.',
      ambiguousPath:
        'Ambiguous route path "{{toPath}}". Specify absolute paths when using `<{{component}} {{attribute}}>` outside of a route.',
    },
    type: "suggestion",
    schema: [
      {
        type: "object",
        properties: {
          enforceInRouteComponents: {
            type: "boolean",
          },
          allowLinksToSelf: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [defaultOptions],
});
