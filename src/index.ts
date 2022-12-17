import { RemixContext } from "./remix/context";
import noRelativePaths from "./rules/no-relative-paths";
import noUrls from "./rules/no-urls";
import requireValidPaths from "./rules/require-valid-paths";
import useLinkForRoutes from "./rules/use-link-for-routes";

declare module "@typescript-eslint/utils/dist/ts-eslint" {
  export interface SharedConfigurationSettings {
    remixReactRoutes?: {
      /** If true, paths/URLs that cannot be statically determined will be reported by no-relative-paths/use-link-for-routes */
      strictMode?: boolean;
      mockRemixContext?: Partial<RemixContext>;
    };
  }
}
export const rules = {
  "no-relative-paths": noRelativePaths,
  "no-urls": noUrls,
  "require-valid-paths": requireValidPaths,
  "use-link-for-routes": useLinkForRoutes,
};
