import { beforeEach, describe } from "@jest/globals";
import { getRuleTester, mockRemixContext } from "../../../testUtils";

import noRelativePaths from "..";

const ruleTester = getRuleTester();

describe("no-relative-paths", () => {
  describe("in a route component", () => {
    beforeEach(() => {
      mockRemixContext({ currentRoutePath: "/foo" });
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
          options: [
            { allowLinksToSelf: false, enforceInRouteComponents: true },
          ],
          errors: [{ messageId: "relativePath" }],
        },
        {
          code: '<Link to="." />',
          options: [
            { allowLinksToSelf: false, enforceInRouteComponents: true },
          ],
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
      ],
    });
  });

  describe("outside a route component", () => {
    beforeEach(() => {
      mockRemixContext();
    });

    ruleTester.run("no-relative-paths", noRelativePaths, {
      valid: [
        { code: '<Link to="/" />' },
        { code: '<Link to="//example.com" />' },
        { code: '<Link to="https://example.com" />' },
        { code: '<Link to="" />' },
        { code: '<Link to="." />' },
        { code: "<Link to={unknown} />" },
      ],
      invalid: [
        {
          code: '<Link to="" />',
          options: [{ allowLinksToSelf: false }],
          errors: [{ messageId: "ambiguousPath" }],
        },
        {
          code: '<Link to="." />',
          options: [{ allowLinksToSelf: false }],
          errors: [{ messageId: "ambiguousPath" }],
        },
        { code: '<Link to=".." />', errors: [{ messageId: "ambiguousPath" }] },
        { code: '<Link to="foo" />', errors: [{ messageId: "ambiguousPath" }] },
        {
          code: "<Link to={`foo/${bar}`} />",
          errors: [{ messageId: "ambiguousPath" }],
        },
      ],
    });
  });
});
