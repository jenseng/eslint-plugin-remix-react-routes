import { ESLintUtils } from "@typescript-eslint/utils";

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/jenseng/eslint-plugin-remix-react-routes/rules/${name}/README.md`
);

/**
 * Roughly behaves like path.resolve, except it 1. doesn't remove repeating slashes and 2. returns undefined rather than
 * throw if it can't resolve the path
 */
export function resolvePath(fromPath: string | undefined, toPath: string) {
  if (isAbsolute(toPath)) return toPath;
  if (!fromPath) return undefined; // can't resolve a relative path if we don't know where we are 🤷‍♂️
  const parts = `${fromPath === "/" ? "" : fromPath}/${toPath}`.split("/");
  const result: string[] = [];
  for (const part of parts) {
    if (part === "..") result.pop();
    else if (part !== ".") result.push(part);
  }
  const resolved = result.join("/");
  return resolved.match(/.\/$/)
    ? resolved.substring(0, resolved.length - 1)
    : resolved;
}

export function isAbsolute(path: string) {
  return path.startsWith("/");
}

// TODO: perhaps make this configurable if users want to lint other components/attributes
export const RoutingComponentAttributeMatchers = [
  { component: "Link", attribute: "to", nativeAlternative: "<a href>" },
  { component: "NavLink", attribute: "to", nativeAlternative: "<a href>" },
  {
    component: "Form",
    attribute: "action",
    nativeAlternative: "<form action>",
  },
];

const IS_A_URI = /^(\w+:)?\/\//;
export function isAUri(path: string) {
  return path.match(IS_A_URI);
}
