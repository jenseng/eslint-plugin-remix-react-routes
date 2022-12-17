import { RemixContext } from "src/remix/context";

declare module "@typescript-eslint/utils/dist/ts-eslint" {
  export interface SharedConfigurationSettings {
    remixReactRoutes?: {
      /** If true, paths/URLs that cannot be statically determined will be reported by no-relative-paths/use-link-for-routes */
      strictMode?: boolean;
      mockRemixContext?: Partial<RemixContext>;
    };
  }
}

export { recommended } from "./recommended";
export { strict } from "./strict";
