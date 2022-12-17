# eslint-plugin-remix-react-routes

Validate routes referenced by `<Link>` and friends in a [Remix](https://remix.run) app.

## Installation

Remix apps generally have [ESLint](https://eslint.org/) pre-configured, but if not you'll want to set it up:

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-remix-react-routes`:

```sh
npm install eslint-plugin-remix-react-routes --save-dev
```

If your app uses TypeScript, you're encouraged to also configure [typed linting](https://typescript-eslint.io/linting/typed-linting/) (and set up [`typescript-eslint`](https://typescript-eslint.io/) while you're at it!). This allows the plugin to fully leverage the type system when evaluating route expressions. To enable typed linting:

```sh
npm install @typescript-eslint/parser --save-dev
```

And add something along these lines to your `.eslintrc.js`:

```javascript
module.exports = {
  // ...
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
```

## Configurations

Most apps should extend from one of the following configurations:

- [`recommended`](https://github.com/jenseng/eslint-plugin-remix-react-routes/tree/main/src/configs/recommended.ts): Recommended route rules that you can drop in to a Remix project.
- [`strict`](https://github.com/jenseng/eslint-plugin-remix-react-routes/tree/main/src/configs/strict.ts): Like `recommended`, but more strict and opinionated.

Add something like this to your `.eslintrc.js`:

```javascript
module.exports = {
  // ...
  extends: [
    // ...
    "plugin:remix-react-routes/recommended",
  ],
};
```

You can also override any config rules to meet your needs:

```javascript
module.exports = {
  // ...
  rules: {
    // ...
    "remix-react-routes/no-relative-paths": [
      // downgrade to a warning
      "warn",
      // enable this check in route components
      { enforceInRouteComponents: true },
    ],
  },
};
```

## Supported Rules

- [use-link-for-routes](https://github.com/jenseng/eslint-plugin-remix-react-routes/tree/main/src/rules/use-link-for-routes) - Ensure routes are linked via `<Link to>` rather than `<a href>`
- [require-valid-paths](https://github.com/jenseng/eslint-plugin-remix-react-routes/tree/main/src/rules/require-valid-paths) - Ensure `<Link>` and friends point to actual routes in the app
- [no-relative-paths](https://github.com/jenseng/eslint-plugin-remix-react-routes/tree/main/src/rules/no-relative-paths) - Ensure `<Link>` and friends use absolute paths
- [no-urls](https://github.com/jenseng/eslint-plugin-remix-react-routes/tree/main/src/rules/no-urls) - Ensure `<Link>` and friends use paths rather than URLs
