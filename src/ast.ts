import type {
  JSXElement,
  JSXExpression,
  JSXExpressionContainer,
  Literal,
  SourceLocation,
  TemplateElement,
} from "@typescript-eslint/types/dist/generated/ast-spec";

const EXPR_PLACEHOLDER = "__EXPR_PLACEHOLDER__";
const mergePattern = new RegExp(`[^/]*${EXPR_PLACEHOLDER}[^/]*`);

/**
 * Convert template parts to a string path, using this simple heuristic:
 *  - If expressions are bounded by slashes, assume they represent a single dynamic path segment
 *  - If not, merge with adjacent segment(s) into a dynamic path segment
 *
 * Examples:
 *  - `foo/${bar}/lol` => "foo/:param/lol"
 *  - `foo/${bar}lol` => "foo/:param"
 */
function stringifyTemplatePath(parts: TemplateElement[]) {
  const values = parts.map((p) => p.value.cooked);
  return values.join(EXPR_PLACEHOLDER).replace(mergePattern, ":param");
}

function getNodeStringValue(node: Literal | JSXExpression) {
  switch (node.type) {
    case "Literal":
      return getStringLiteralValue(node);
    case "JSXExpressionContainer":
      return getJSXExpressionStringValue(node);
  }
}

function getStringLiteralValue(node: Literal) {
  if (typeof node.value !== "string") return; // 🤷‍♂️
  return node.value;
}

function getJSXExpressionStringValue(node: JSXExpressionContainer) {
  const { expression } = node;
  switch (expression.type) {
    case "TemplateLiteral":
      const stringifiedPath = stringifyTemplatePath(expression.quasis);
      return stringifiedPath ?? undefined;
    case "Literal":
      return getStringLiteralValue(expression);
  }
}

/**
 * Resolve matching string attributes for this element and run the callback for each one.
 */
export function forEachStringAttribute<
  T extends { component: string; attribute: string }
>(
  node: JSXElement,
  attributeMatchers: T[],
  cb: (
    data: T & {
      value: string;
      loc: SourceLocation;
    }
  ) => void
) {
  if (node.openingElement.name.type !== "JSXIdentifier") return;
  const {
    attributes,
    name: { name: componentName },
  } = node.openingElement;

  attributeMatchers = attributeMatchers.filter(
    ({ component }) => component === componentName
  );
  for (const attribute of attributes) {
    if (attribute.type !== "JSXAttribute") continue;
    if (!attribute.value) continue;
    const matcher = attributeMatchers.find(
      (ca) => ca.attribute === attribute.name.name
    );
    if (!matcher) continue;
    const value = getNodeStringValue(attribute.value)?.replace(/(\?|#).*/, "");
    const loc = attribute.value.loc;
    if (typeof value === "undefined") continue;
    cb({ ...matcher, value, loc });
  }
}
