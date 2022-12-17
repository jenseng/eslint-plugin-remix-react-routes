import { getRuleTester, typeCheckingParserOptions } from "../../../testUtils";

import requireValidPaths from "..";
import { RemixContext } from "src/remix/context";

const mockRemixContext: RemixContext = {
  appConfig: { appDirectory: "/", routes: [] },
  currentRoutePath: "/valid",
  validateRoute(path) {
    return ["/", "/valid", "/valid/child", "/valid/child/:param"].includes(
      path
    );
  },
};

const ruleTester = getRuleTester({
  settings: { remixReactRoutes: { mockRemixContext } },
});

ruleTester.run("require-valid-paths", requireValidPaths, {
  valid: [
    { code: '<Link to="/valid" />' },
    { code: '<Link to="child" />' },
    { code: '<Link to="//example.com" />' },
    { code: '<Link to="https://example.com" />' },
    { code: '<Link to="" />' },
    { code: '<Link to="." />' },
    { code: '<Link to=".." />' },
    { code: "<Link to={`child/${bar}`} />" },
    { code: "<Link to={`${'c'}hild/${bar}`} />" },
    { code: "<Link to={unknown} />" },
    {
      code: 'const VALID = "/valid"; return <Link to={VALID} />;',
    },
    {
      code: 'const VALID = "/valid"; const CHILD = "/child"; return <Link to={`${VALID}${CHILD}`} />;',
      parserOptions: typeCheckingParserOptions,
    },
    // ambiguous relative path checks are handled by no-relative-paths, so we don't error here
    {
      code: '<Link to="invalid" />',
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
    },
    {
      code: "<Link to={`invalid/${bar}`} />",
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
    },
    {
      code: "<Link to={`${'i'}nvalid/${bar}`} />",
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
    },
  ],
  invalid: [
    {
      code: "<Link to={unknown} />",
      settings: { remixReactRoutes: { strictMode: true } },
      errors: [{ messageId: "indeterminatePath" }],
    },
    {
      code: '<Link to="/invalid" />',
      errors: [{ messageId: "invalidPath" }],
    },
    {
      code: '<Link to="invalid" />',
      errors: [{ messageId: "invalidPath" }],
    },
    {
      code: "<Link to={`invalid/${bar}`} />",
      errors: [{ messageId: "invalidPath" }],
    },
    {
      code: "<Link to={`${'i'}nvalid/${bar}`} />",
      errors: [{ messageId: "invalidPath" }],
    },
    {
      // this is a valid path, but we can't know that without type checking
      code: 'const VALID = "/valid"; const CHILD = "/child"; return <Link to={`${VALID}${CHILD}`} />;',
      errors: [{ messageId: "invalidPath" }],
    },
    {
      code: 'const INVALID = "/invalid"; return <Link to={INVALID} />;',
      errors: [{ messageId: "invalidPath" }],
      parserOptions: typeCheckingParserOptions,
    },
    {
      code: 'const INVALID = "/invalid"; return <Link to={`${INVALID}/path`} />;',
      errors: [{ messageId: "invalidPath" }],
      parserOptions: typeCheckingParserOptions,
    },
  ],
});
