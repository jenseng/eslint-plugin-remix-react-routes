import noRelativePaths from "./rules/no-relative-paths";
import noUrls from "./rules/no-urls";
import requireValidPaths from "./rules/require-valid-paths";
import useLinkForRoutes from "./rules/use-link-for-routes";

export const rules = {
  "no-relative-paths": noRelativePaths,
  "no-urls": noUrls,
  "require-valid-paths": requireValidPaths,
  "use-link-for-routes": useLinkForRoutes,
};
