# Ensure `<Link>` and friends use paths rather than URLs (`remix-react-routes/no-urls`)

## Rule Details

By default this rule ensures that paths are used instead of URLs on `<Link>` / `<NavLink>` / `<Form>` elements in the [Remix](https://remix.run) app. These components do not support URLs, so specifying them will have surprising behavior (e.g. `<Link to="http://example.com">` creates something like `<a href="/current/path/http://example.com">`).

### Examples of incorrect code for this rule:

**app/routes/index.jsx**

```jsx
return (
  // From Link's point of view, this is actually a relative link 😬
  <Link to="http://example.com">Example</Link>
);
```

### Examples of correct code for this rule:

**app/routes/index.jsx**

```jsx
return (
  // That's better 😅
  <a href="http://example.com">Example</a>
);
```

## When Not To Use It

If you don't care about potential 404s you can disable this rule 🫠
