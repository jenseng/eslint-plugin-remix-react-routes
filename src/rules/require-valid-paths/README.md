# Ensure `<Link>` and friends point to valid routes in the app (`remix-react-routes/require-valid-paths`)

## Rule Details

By default this rule ensures that literal paths specified on `<Link>` / `<NavLink>` / `<Form>` elements correspond to actual routes in the [Remix](https://remix.run) app.

This rule checks:

- Any path used within a route component
- Absolute paths used outside a route component

This rule does not check:

- Paths that look like URLs (these are handled by [no-urls](../no-urls/))

### Examples of incorrect code for this rule:

**app/components/header.jsx**

```jsx
return (
  <>
    <Link to="/not/a/valid/route">One</Link>
    <Link to={`/also/not/a/valid/route/${param}`}>Two</Link>
  </>
);
```

**app/routes/index.jsx**

```jsx
return (
  <>
    <Link to="not/a/valid/route">One</Link>
    <Link to={`/also/not/a/valid/route/${param}`}>Two</Link>
  </>
);
```

### Examples of correct code for this rule:

**app/components/header.jsx**

```jsx
return (
  <>
    <Link to="/a/valid/route">One</Link>
    <Link to={`/also/a/valid/route/${param}`}>Two</Link>
  </>
);
```

**app/routes/index.jsx**

```jsx
return (
  <>
    <Link to="a/valid/route">One</Link>
    <Link to={`/also/a/valid/route/${param}`}>Two</Link>
  </>
);
```

## When Not To Use It

If you don't care about potential 404s you can disable this rule 🫠
