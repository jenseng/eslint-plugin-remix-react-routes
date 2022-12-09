import { afterAll, describe, expect, it } from "@jest/globals";
import { buildAppFactory } from "./utils";

const remixVersion = process.env.REMIX_VERSION ?? "latest";
const buildApp = buildAppFactory(remixVersion);

describe(`remix@${remixVersion}`, () => {
  const moduleWithLinks = `
    import { Link } from "@remix-run/react";
    export default function() {
      return <Link to="/">Absolute Valid</Link>;
      return <Link to="/absolute/invalid">Absolute Invalid</Link>;
      return <Link to="relative/invalid">Relative Invalid</Link>;
      return <Link to=".">Relative Self</Link>;
    }
  `;

  afterAll(() => {
    buildApp.cleanup();
  });

  it("should apply route rules correctly", () => {
    const app = buildApp({
      files: {
        ".eslintrc.js": `
          module.exports = {
            plugins: ["remix-react-routes"],
            parser: "@typescript-eslint/parser",
            rules: {
              "remix-react-routes/no-relative-paths": 2,
              "remix-react-routes/require-valid-paths": 2
            }
          };
        `,
        "app/routes/index.tsx": moduleWithLinks,
        "app/routes/foo/index.tsx": moduleWithLinks,
        "app/routes/foo/$bar.tsx": moduleWithLinks,
        "app/components/component.tsx": moduleWithLinks,
      },
    });

    const results = app.lint();

    expect(results["app/root.tsx"]).toEqual([]);
    expect(results["app/routes/index.tsx"]).toEqual([
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
    expect(results["app/routes/foo/index.tsx"]).toEqual([
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
    expect(results["app/routes/foo/$bar.tsx"]).toEqual([
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
    expect(results["app/components/component.tsx"]).toEqual([
      "remix-react-routes/no-relative-paths:ambiguousPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
  });

  it.todo("should watch for changes");
});
