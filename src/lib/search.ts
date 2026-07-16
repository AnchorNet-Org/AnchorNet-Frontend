/**
 * Client-side search helper shared by the anchors and settlements tables.
 */

/**
 * Returns true if `query` is blank, or is found as a case-insensitive
 * substring of any of `fields`. Non-string fields (e.g. a settlement id) are
 * stringified before matching. Whitespace is normalized so pasted identifiers
 * and multi-word queries do not miss matches due to accidental extra spaces.
 */
export function matchesQuery(
  fields: Array<string | number>,
  query: string,
): boolean {
  const needle = normalizeSearchText(query);
  if (needle === "") return true;
  return fields.some((field) =>
    normalizeSearchText(String(field)).includes(needle),
  );
}

function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
