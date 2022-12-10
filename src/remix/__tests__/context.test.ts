import { describe, expect, it, jest } from "@jest/globals";
import { getRemixAppConfig } from "../appConfig";
import { getRemixContext } from "../context";

jest.mock("../appConfig");

const getRemixAppConfigMock = <jest.Mock<typeof getRemixAppConfig>>(
  getRemixAppConfig
);
getRemixAppConfigMock.mockReturnValue({
  routes: [
    {
      id: "root",
      path: "",
      file: "root.tsx",
      children: [
        {
          id: "routes/index",
          index: true,
          file: "routes/index.tsx",
        },
        {
          id: "routes/foo",
          path: "foo",
          file: "routes/foo.tsx",
          children: [
            {
              id: "routes/foo/index",
              index: true,
              file: "routes/foo/index.tsx",
            },
            {
              id: "routes/foo/bar",
              path: "bar",
              file: "routes/foo/bar.tsx",
            },
            {
              id: "routes/foo/$child",
              path: ":child",
              file: "routes/foo/$child.tsx",
            },
          ],
        },
      ],
    },
  ],
  appDirectory: "/foo",
});

describe("remixConfig", () => {
  describe("validateRoutes", () => {
    const { validateRoute, appConfig } = getRemixContext({
      getFilename: () => "",
    });
    it("matches valid routes", () => {
      expect(validateRoute("/")).toBe(true);
      expect(validateRoute("/foo")).toBe(true);
      expect(validateRoute("/foo/bar")).toBe(true);
      expect(validateRoute("/foo/dynamic")).toBe(true);
    });
    it("doesn't match invalid routes", () => {
      expect(validateRoute("/baz")).toBe(false);
    });
  });
});
