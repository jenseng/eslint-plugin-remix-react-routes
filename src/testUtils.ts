import { jest } from "@jest/globals";
import { ESLintUtils } from "@typescript-eslint/utils";
import { getRemixContext, RemixContext } from "./remix/context";

jest.mock("./remix/context");

export function mockRemixContext(context: Partial<RemixContext> = {}) {
  (getRemixContext as jest.Mock<typeof getRemixContext>).mockReturnValue({
    validateRoute: () => true,
    ...context,
  });
}

export function getRuleTester() {
  return new ESLintUtils.RuleTester({
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  });
}
