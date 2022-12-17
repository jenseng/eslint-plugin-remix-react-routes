// import { jest } from "@jest/globals";
import { ESLintUtils } from "@typescript-eslint/utils";
import {
  RuleTesterConfig,
  SharedConfigurationSettings,
} from "@typescript-eslint/utils/dist/ts-eslint";
import * as path from "path";
import { RemixContext } from "./remix/context";
// import { getRemixContext, RemixContext } from "./remix/context";

// jest.mock("./remix/context");

// export function mockRemixContext(context: Partial<RemixContext> = {}) {
//   (getRemixContext as jest.Mock<typeof getRemixContext>).mockReturnValue({
//     validateRoute: () => true,
//     ...context,
//   });
// }

export const typeCheckingParserOptions = {
  project: "./tsconfig.json",
  tsconfigRootDir: path.join(__dirname, "__tests__"),
  ecmaFeatures: {
    jsx: true,
  },
};

export function mockRemixContextSettings(
  mockRemixContext?: Partial<RemixContext>
): SharedConfigurationSettings {
  return { remixReactRoutes: { mockRemixContext } };
}

export function getRuleTester(options: Partial<RuleTesterConfig> = {}) {
  return new ESLintUtils.RuleTester({
    ...options,
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  });
}
