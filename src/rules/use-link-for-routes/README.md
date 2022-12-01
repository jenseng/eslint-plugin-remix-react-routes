# Ensure routes are linked via `<Link to>` rather than `<a href>` (`remix-react-routes/use-link-for-routes`)

## Rule Details

By default this rule ensures that links to routes are implemented with `<Link to>` rather than `<a href>` in a [Remix](https://remix.run) app. This ensures faster page transitions for end-users.

### Examples of incorrect code for this rule:

**app/routes/something.jsx**

```jsx
return (
  <>
    <a href="/some/route">A page</a>
    <a href="../another/route">Another page</a>
  </>
);
```

### Examples of correct code for this rule:

**app/routes/something.jsx**

```jsx
return (
  <>
    <Link to="/some/route">A page</Link>
    <Link to="../another/route">Another page</Link>
    <a href="http://example.com">Something external</a>
    <a href="//example.com">A scheme-relative link</a>
  </>
);
```

## When Not To Use It

If you don't care about your app's UX 🫠
