import { afterAll, describe, expect, it } from "@jest/globals";
import { buildAppFactory } from "./utils";

const remixVersion = process.env.REMIX_VERSION ?? "latest";
const buildApp = buildAppFactory(remixVersion);

describe(`remix@${remixVersion}`, () => {
  const moduleWithLinks = `
    import { Link } from "@remix-run/react";
    const VALID_PATH = "/";
    const INVALID_PATH = "/absolute/invalid";
    export default function() {
      return <Link to="/">Absolute Valid</Link>;
      return <Link to="/absolute/invalid">Absolute Invalid</Link>;
      return <Link to="relative/invalid">Relative Invalid</Link>;
      return <Link to=".">Relative Self</Link>;

      // these are both ignored unless typed linting + strictMode is enabled
      return <Link to={VALID_PATH}>Absolute Valid 2</Link>;
      return <Link to={INVALID_PATH}>Absolute Invalid 2</Link>;
    }
  `;

  afterAll(() => {
    buildApp.cleanup();
  });

  it("should apply route rules correctly for JavaScript", () => {
    const app = buildApp({
      files: {
        ".eslintrc.js": `
          module.exports = {
            plugins: ["remix-react-routes"],
            parserOptions: {
              ecmaFeatures: {
                jsx: true,
              },
              ecmaVersion: 2015,
              sourceType: "module",
            },
            rules: {
              "remix-react-routes/no-relative-paths": 2,
              "remix-react-routes/require-valid-paths": 2,
            },
          };
        `,
        "app/routes/index.jsx": moduleWithLinks,
        "app/routes/foo/$bar.jsx": moduleWithLinks,
        "app/components/component.jsx": moduleWithLinks,
      },
    });

    const results = app.lint();

    expect(results["app/routes/index.jsx"]).toEqual([
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
    expect(results["app/routes/foo/$bar.jsx"]).toEqual([
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
    expect(results["app/components/component.jsx"]).toEqual([
      "remix-react-routes/no-relative-paths:ambiguousPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
  });

  it("should apply route rules correctly for TypeScript", () => {
    const app = buildApp({
      files: {
        ".eslintrc.js": `
          module.exports = {
            plugins: ["remix-react-routes"],
            parser: "@typescript-eslint/parser",
            rules: {
              "remix-react-routes/no-relative-paths": 2,
              "remix-react-routes/require-valid-paths": 2,
            },
          };
        `,
        "app/routes/index.tsx": moduleWithLinks,
        "app/routes/foo/$bar.tsx": moduleWithLinks,
        "app/components/component.tsx": moduleWithLinks,
      },
    });

    const results = app.lint();

    expect(results["app/routes/index.tsx"]).toEqual([
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

  it("should apply route rules correctly for TypeScript with type information", () => {
    const app = buildApp({
      files: {
        ".eslintrc.js": `
          module.exports = {
            plugins: ["remix-react-routes"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
              project: "./tsconfig.json",
              tsconfigRootDir: __dirname,
            },
            rules: {
              "remix-react-routes/no-relative-paths": 2,
              "remix-react-routes/require-valid-paths": 2,
            },
            settings: {
              remixReactRoutes: {
                strictMode: true,
              },
            },
          };
        `,
        "app/routes/index.tsx": moduleWithLinks,
        "app/routes/foo/$bar.tsx": moduleWithLinks,
        "app/components/component.tsx": moduleWithLinks,
      },
    });

    const results = app.lint();

    expect(results["app/routes/index.tsx"]).toEqual([
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
    expect(results["app/routes/foo/$bar.tsx"]).toEqual([
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
    expect(results["app/components/component.tsx"]).toEqual([
      "remix-react-routes/no-relative-paths:ambiguousPath",
      "remix-react-routes/require-valid-paths:invalidPath",
      "remix-react-routes/require-valid-paths:invalidPath",
    ]);
  });

  it.todo("should watch for changes");
});
