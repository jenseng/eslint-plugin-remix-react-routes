import { getRuleTester } from "../../../testUtils";

import useLinkForRoutes from "..";

const ruleTester = getRuleTester();

ruleTester.run("use-link-for-routes", useLinkForRoutes, {
  valid: [
    { code: '<a href="https://example.com" />' },
    { code: '<a href="//example.com" />' },
    { code: "<a href={`http://${unknown}`} />" },
    { code: "<a href={unknown} />" },
  ],
  invalid: [
    {
      code: "<a href={unknown} />",
      settings: { remixReactRoutes: { strictMode: true } },
      errors: [{ messageId: "indeterminateUrl" }],
    },
    {
      code: '<a href="foo" />',
      errors: [{ messageId: "anchorForRoute" }],
    },
    {
      code: '<a href=".." />',
      errors: [{ messageId: "anchorForRoute" }],
    },
    {
      code: "<a href={`foo/${unknown}`} />",
      errors: [{ messageId: "anchorForRoute" }],
    },
  ],
});
