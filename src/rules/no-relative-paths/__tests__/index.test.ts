import { getRuleTester } from "../../../testUtils";

import noRelativePaths from "..";

const ruleTester = getRuleTester({
  settings: {
    remixReactRoutes: { mockRemixContext: { currentRoutePath: "/foo" } },
  },
});

ruleTester.run("no-relative-paths", noRelativePaths, {
  valid: [
    { code: '<Link to="/" />' },
    { code: '<Link to="//example.com" />' },
    { code: '<Link to="https://example.com" />' },
    { code: '<Link to="" />' },
    { code: '<Link to="." />' },
    { code: '<Link to=".." />' },
    { code: '<Link to="foo" />' },
    { code: "<Link to={`foo/${bar}`} />" },
    { code: "<Link to={unknown} />" },
  ],
  invalid: [
    {
      code: '<Link to="" />',
      options: [{ allowLinksToSelf: false, enforceInRouteComponents: true }],
      errors: [{ messageId: "relativePath" }],
    },
    {
      code: '<Link to="." />',
      options: [{ allowLinksToSelf: false, enforceInRouteComponents: true }],
      errors: [{ messageId: "relativePath" }],
    },
    {
      code: '<Link to=".." />',
      options: [{ enforceInRouteComponents: true }],
      errors: [{ messageId: "relativePath" }],
    },
    {
      code: '<Link to="foo" />',
      options: [{ enforceInRouteComponents: true }],
      errors: [{ messageId: "relativePath" }],
    },
    // outside route components, we're more strict around relative paths
    {
      code: '<Link to="" />',
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
      options: [{ allowLinksToSelf: false }],
      errors: [{ messageId: "ambiguousPath" }],
    },
    {
      code: '<Link to="." />',
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
      options: [{ allowLinksToSelf: false }],
      errors: [{ messageId: "ambiguousPath" }],
    },
    {
      code: '<Link to=".." />',
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
      errors: [{ messageId: "ambiguousPath" }],
    },
    {
      code: '<Link to="foo" />',
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
      errors: [{ messageId: "ambiguousPath" }],
    },
    {
      code: "<Link to={`foo/${bar}`} />",
      settings: {
        remixReactRoutes: { mockRemixContext: { currentRoutePath: "" } },
      },
      errors: [{ messageId: "ambiguousPath" }],
    },
  ],
});
