import type {
  JSXAttribute,
  JSXElement,
  JSXExpression,
  JSXExpressionContainer,
  JSXSpreadAttribute,
  Literal,
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

function getAttributes(
  attributes: (JSXAttribute | JSXSpreadAttribute)[],
  names: readonly string[]
) {
  return attributes.filter(
    (a) => a.type === "JSXAttribute" && names.includes(a.name.name as string)
  ) as JSXAttribute[];
}

type ValuedAttribute = JSXAttribute & { value: Literal | JSXExpression };

/**
 * If this is a routing-aware element (e.g. <Link>), resolve any path-y
 * attributes (e.g. `to`) and their string values, and run the callback
 */
export function eachRoutePathAttribute(
  node: JSXElement,
  routingComponentAttributeMap: Record<string, readonly string[]>,
  cb: (data: {
    componentName: string;
    attribute: ValuedAttribute;
    value: string;
  }) => void
) {
  if (node.openingElement.name.type !== "JSXIdentifier") return;
  const {
    attributes,
    name: { name: componentName },
  } = node.openingElement;
  const attributeNames = routingComponentAttributeMap[componentName] || [];
  const attrs = getAttributes(attributes, attributeNames);
  for (const attribute of attrs) {
    if (!attribute.value) continue;
    const value = getNodeStringValue(attribute.value);
    if (!value) continue;
    cb({ componentName, attribute: attribute as ValuedAttribute, value });
  }
}
