# Ensure `<Link>` and friends use absolute paths (`remix-react-routes/no-relative-paths`)

## Rule Details

By default this rule requires absolute paths when using `<Link>` / `<NavLink>` / `<Form>` elements within a non-route component in a [Remix](https://remix.run) app. Since non-route components may be used in any route, relative paths may potentially lead to non-existent routes.

This rule checks:

- Relative paths used outside a route component
- Relative paths used within a route component (if `enforceInRouteComponents=true`)

This rule does not check:

- Paths that look like URLs (these are handled by [no-urls](../no-urls/))

Relative paths to the current route are allowed by default (e.g. `<Link to="?some=param">`), but can be disallowed (if `allowLinksToSelf=false`).

### Examples of incorrect code for this rule:

**app/components/header.jsx**

```jsx
return <Link to="settings">Settings</Link>;
```

### Examples of correct code for this rule:

**app/components/header.jsx**

```jsx
return <Link to="/settings">Settings</Link>;
```

**app/routes/index.jsx**

```jsx
return <Link to="settings"></Link>;
```

## Rule Options

The supported options are:

- `enforceInRouteComponents` (default `false`) - Disallow using relative paths within route components. Although relative paths can be consistently resolved in these cases, they can make refactoring more difficult, so you might consider enabling this option.
- `allowLinksToSelf` (default `true`) - Allow relative links to the current route. This can be useful if you are linking to the current route with different search parameters or a URL fragment.

To use, you can specify as follows:

```javascript
"remix-react-routes/no-relative-paths": [<enabled>, {"enforceInRouteComponents": true}]
```

## When Not To Use It

If you don't care about potential 404s you can disable this rule 🫠
