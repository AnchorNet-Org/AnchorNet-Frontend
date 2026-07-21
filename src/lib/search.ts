/**
 * Client-side search helper shared by the anchors and settlements tables.
 */

/**
 * Returns true if `query` is blank, or if every space-separated term in the
 * query is found as a case-insensitive substring of any of `fields` (AND
 * semantics). Non-string fields (e.g. a settlement id) are stringified before
 * matching.
 */
export function matchesQuery(
  fields: Array<string | number>,
  query: string,
): boolean {
  const trimmed = query.trim().replace(/\s+/g, " ").toLowerCase();
  if (trimmed === "") return true;
  const terms = trimmed.split(" ");
  return terms.every((term) =>
    fields.some((field) => String(field).toLowerCase().includes(term))
  );
}
