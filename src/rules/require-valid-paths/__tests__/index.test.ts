import { beforeEach, describe } from "@jest/globals";
import { getRuleTester, mockRemixContext } from "../../../testUtils";

import requireValidPaths from "..";

const ruleTester = getRuleTester();

describe("require-valid-paths", () => {
  describe("in a route component", () => {
    beforeEach(() => {
      mockRemixContext({
        appConfig: { appDirectory: "/", routes: [] },
        currentRoutePath: "/valid",
        validateRoute(path) {
          return [
            "/",
            "/valid",
            "/valid/child",
            "/valid/child/:param",
          ].includes(path);
        },
      });
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
        { code: "<Link to={unknown} />" },
      ],
      invalid: [
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
      ],
    });
  });

  describe("outside a route component", () => {
    beforeEach(() => {
      mockRemixContext({
        appConfig: { appDirectory: "/", routes: [] },
        validateRoute(path) {
          return [
            "/",
            "/valid",
            "/valid/child",
            "/valid/child/:param",
          ].includes(path);
        },
      });
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
        { code: "<Link to={unknown} />" },
        // relative paths defer to no-relative-paths
        { code: '<Link to="invalid" />' },
        { code: "<Link to={`invalid/${bar}`} />" },
      ],
      invalid: [
        {
          code: '<Link to="/invalid" />',
          errors: [{ messageId: "invalidPath" }],
        },
      ],
    });
  });
});
