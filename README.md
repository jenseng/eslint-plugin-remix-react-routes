# eslint-plugin-remix-react-routes

Validate &lt;Link&gt; and friends point to valid routes in a Remix app

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
    "plugins": [
        "remix-react-routes"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "remix-react-routes/rule-name": 2
    }
}
```

## Supported Rules

* Fill in provided rules here


