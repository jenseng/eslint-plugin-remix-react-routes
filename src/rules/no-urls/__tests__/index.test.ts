import { beforeEach, describe } from "@jest/globals";
import { getRuleTester, mockRemixContext } from "../../../testUtils";

import noUrls from "..";

const ruleTester = getRuleTester();

describe("no-urls", () => {
  beforeEach(() => {
    mockRemixContext();
  });

  ruleTester.run("no-urls", noUrls, {
    valid: [
      { code: '<Link to="/" />' },
      { code: '<Link to="foo" />' },
      { code: '<Link to="" />' },
      { code: '<Link to="." />' },
      { code: '<Link to=".." />' },
      { code: "<Link to={unknown} />" },
    ],
    invalid: [
      {
        code: '<Link to="//example.com" />',
        errors: [{ messageId: "urlAsPath" }],
      },
      {
        code: '<Link to="https://example.com" />',
        errors: [{ messageId: "urlAsPath" }],
      },
    ],
  });
});
