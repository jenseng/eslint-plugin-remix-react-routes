import type {
  JSXElement,
  Literal,
  SourceLocation,
  TemplateLiteral,
} from "@typescript-eslint/types/dist/generated/ast-spec";
import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import { RuleContext } from "@typescript-eslint/utils/dist/ts-eslint";

const EXPR_PLACEHOLDER = "--__EXPR_PLACEHOLDER__--";
const mergePattern = new RegExp(`[^/]*${EXPR_PLACEHOLDER}[^/]*`, "g");

/**
 * Normalize a string path value:
 *  - Remove query parameters and hash fragments
 *  - If expressions are bounded by slashes, assume they represent a single dynamic path segment
 *  - If not, merge with adjacent segment(s) into a dynamic path segment
 *
 * Examples:
 *  - `foo/--__EXPR_PLACEHOLDER__--/lol?ok` => "foo/:param/lol"
 *  - `foo/--__EXPR_PLACEHOLDER__--lol#huh` => "foo/:param"
 */
export function getPathValue(path: string) {
  return path.replace(mergePattern, ":param").replace(/(\?|#).*/, "");
}

/**
 * Resolve a template literal to a string, as best we can
 *
 * @example
 * `foo/${"test"}/${1}/${unknown}/lol` => "foo/test/1/--__EXPR_PLACEHOLDER__--/lol"
 */
function resolveTemplateLiteralExpressions(
  { expressions, quasis }: TemplateLiteral,
  resolveType: ResolveType
) {
  const result: string[] = [];
  let current: string | undefined;
  quasis.forEach((quasi, i) => {
    current = `${typeof current !== "undefined" ? current : ""}${
      quasi.value.cooked
    }`;
    // last quasi, so we're done
    if (i === expressions.length) {
      result.push(current);
      return;
    }
    // see if the following expression is a literal, in which case we add to current
    const exprStringValue = getNodeStringValue(expressions[i], resolveType);
    if (exprStringValue !== null) {
      current += exprStringValue;
      return;
    }
    // otherwise we don't know what the expression is 🤷‍♂️
    result.push(current);
    current = undefined;
  });
  return result.join(EXPR_PLACEHOLDER);
}

function getNodeStringValue(
  node: TSESTree.Node,
  resolveType: ResolveType
): string | null {
  switch (node.type) {
    case "JSXExpressionContainer":
      return getNodeStringValue(node.expression, resolveType);
    case "Literal":
      return getStringLiteralValue(node);
    case "TemplateLiteral":
      return resolveTemplateLiteralExpressions(node, resolveType);
    default:
      // see if the type checker can resolve the value 🤞
      const nodeType = resolveType(node);
      if (nodeType?.isLiteral()) return String(nodeType.value);
  }
  return null;
}

function getStringLiteralValue(node: Literal) {
  // if (typeof node.value !== "string") return; // 🤷‍♂️
  return String(node.value);
}

/**
 * Resolve matching string attributes for this element and run the callback for each one.
 */
export function forEachStringAttribute<
  T extends { component: string; attribute: string }
>(
  node: JSXElement,
  resolveType: ResolveType,
  attributeMatchers: T[],
  cb: (
    data: T & {
      value: string | null;
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
    const value = getNodeStringValue(attribute.value, resolveType);
    const loc = attribute.value.loc;
    if (typeof value === "undefined") continue;
    cb({ ...matcher, value, loc });
  }
}

export function buildResolveType(context: RuleContext<any, any>) {
  try {
    const parserServices = ESLintUtils.getParserServices(context);
    const typeChecker = parserServices.program.getTypeChecker();
    return (node: TSESTree.Node) => {
      const originalNode = parserServices.esTreeNodeToTSNodeMap.get(node);
      return typeChecker.getTypeAtLocation(originalNode);
    };
  } catch (e) {
    return () => {};
  }
}

type ResolveType = ReturnType<typeof buildResolveType>;
