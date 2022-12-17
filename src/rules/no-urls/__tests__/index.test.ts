import { beforeEach, describe } from "@jest/globals";
import { getRuleTester, typeCheckingParserOptions } from "../../../testUtils";

import noUrls from "..";

const ruleTester = getRuleTester();

ruleTester.run("no-urls", noUrls, {
  valid: [
    { code: '<Link to="/" />' },
    { code: '<Link to="foo" />' },
    { code: '<Link to="" />' },
    { code: '<Link to="." />' },
    { code: '<Link to=".." />' },
    { code: "<Link to={unknown} />" },
    {
      code: 'const BASE_PATH = "/en-us"; return <Link to={`${BASE_PATH}/`} />;',
    },
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
    {
      code: 'const BASE_URL = "https://example.com"; return <Link to={`${BASE_URL}/`} />;',
      parserOptions: typeCheckingParserOptions,
      errors: [{ messageId: "urlAsPath" }],
    },
  ],
});
