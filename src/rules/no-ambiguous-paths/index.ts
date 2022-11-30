import { getRemixContext } from "../../remixContext";
import { eachRoutePathAttribute } from "../../ast";
import {
  createRule,
  isAbsolute,
  isAUri,
  RoutingComponentAttributes,
} from "../common";

type Options = [
  {
    enforceInRouteComponents: boolean;
  }
];
export default createRule<Options, "ambiguousPath" | "urlAsPath">({
  create(context) {
    const { appConfig, currentRoutePath } = getRemixContext(context);
    if (!appConfig) return {}; // Not in a Remix app or there was an error, so 🤷‍♂️

    // If we're inside a route, we can resolve relative paths, so bail if the options allow it
    if (currentRoutePath && !context.options[0]?.enforceInRouteComponents)
      return {};
    // TODO: though consider linting full-stack components exported from a route module 🤔

    return {
      JSXElement(node) {
        eachRoutePathAttribute(
          node,
          RoutingComponentAttributes,
          ({ component, attribute, value: toPath, nativeAlternative, loc }) => {
            if (isAbsolute(toPath)) return;
            context.report({
              messageId: isAUri(toPath) ? "urlAsPath" : "ambiguousPath",
              loc,
              data: {
                toPath,
                component,
                attribute,
                nativeAlternative,
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
        "Ensure <Link> and friends have absolute paths when used outside of a route.",
      recommended: "warn",
    },
    messages: {
      ambiguousPath:
        'Ambiguous route path "{{toPath}}". Specify absolute paths when using `<{{component}} {{attribute}}>` outside of a route.',
      urlAsPath: `Ambiguous route path "{{toPath}}". If you're trying to reference a URL, consider using \`{{nativeAlternative}}\` instead.`,
    },
    type: "suggestion",
    schema: [
      {
        type: "object",
        properties: {
          enforceInRouteComponents: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ enforceInRouteComponents: false }],
});
