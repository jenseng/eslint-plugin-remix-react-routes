# eslint-plugin-remix-react-routes

Validate routes referenced by `<Link>` and friends in a [Remix](https://remix.run) app.

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-remix-react-routes`:

```sh
npm install eslint-plugin-remix-react-routes --save-dev
```

## Usage

Add `remix-react-routes` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["remix-react-routes"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "remix-react-routes/require-valid-paths": 2,
    "remix-react-routes/no-relative-paths": 2
  }
}
```

## Supported Rules

- [require-valid-paths](src/rules/require-valid-paths) - Ensure `<Link>` and friends point to actual routes in the app
- [no-relative-paths](src/rules/no-relative-paths) - Ensure `<Link>` and friends use absolute paths
