**Close:** #180

---

## Summary of the Issue

`fetchSettlements` and `exportSettlementsCsv` in `src/lib/settlementsApi.ts` each independently build an identical `URLSearchParams` from the same `{ anchor, page, pageSize }` shape, duplicating the same conditional `.set(...)` calls twice in the same file. This pattern is also a natural fit for `anchorsApi.ts` functions if they ever grow filter parameters.

---

## Root Cause

There was no shared query-string builder utility. Each function that needed URL query parameters re-implemented the same pattern:

```ts
const params = new URLSearchParams();
if (anchor) params.set("anchor", anchor);
if (page) params.set("page", String(page));
if (pageSize) params.set("pageSize", String(pageSize));
const query = params.toString() ? `?${params.toString()}` : "";
```

---

## Solution Implemented

### 1. `buildQueryParams` helper (`src/lib/api.ts`)

A reusable, tested utility function:

```ts
buildQueryParams(params: Record<string, string | number | undefined>): string
```

- Accepts an object of key-value pairs
- **Skips keys whose values are `undefined`** (so callers can spread optional params freely)
- Returns `"?key=value&key2=value2"` or `""` when no params are present
- Placed alongside `apiRequest` in `src/lib/api.ts` so both `settlementsApi.ts` and `anchorsApi.ts` can reuse it

### 2. `fetchSettlements` updated (`src/lib/settlementsApi.ts`)

Replaced the inline `URLSearchParams` construction with a single call to `buildQueryParams`:

```ts
const query = buildQueryParams({ anchor, page, pageSize });
```

### 3. Unit tests (`src/lib/api.test.ts`)

Added 11 test cases covering:

| Test                            | Description                        |
| ------------------------------- | ---------------------------------- |
| Empty params object             | Returns `""`                       |
| All values undefined            | Returns `""`                       |
| Single parameter                | `"?anchor=a"`                      |
| Multiple parameters             | `"?anchor=a&page=1&pageSize=20"`   |
| Mixed defined/undefined         | Skips undefined, includes defined  |
| Number conversion               | `"?page=5"`                        |
| URL encoding                    | `"?name=hello+world"`              |
| Insertion order                 | Preserved                          |
| `FetchSettlementsOptions` shape | Matches expected output            |
| Original logic equivalence      | Confirms identical to inline logic |
| Empty options equivalence       | Confirms `""` for all-undefined    |

---

## Key Changes Made

| File                        | Change                                                   |
| --------------------------- | -------------------------------------------------------- |
| `src/lib/api.ts`            | Added `buildQueryParams()` helper alongside `apiRequest` |
| `src/lib/settlementsApi.ts` | Updated `fetchSettlements` to use `buildQueryParams`     |
| `src/lib/api.test.ts`       | Added 11 test cases for `buildQueryParams`               |

---

## Trade-offs & Considerations

- **Pure refactor**: No behavior change — the generated request URLs are identical for all existing test cases
- **No new dependencies**: Uses built-in `URLSearchParams` (available in Node.js, browsers, and jsdom test environment)
- **Type safety**: The `Record<string, string \| number \| undefined>` type catches accidental `null` values while allowing optional params to be omitted naturally
- **Extensible**: `anchorsApi.ts` can adopt the same helper when its endpoints grow filter parameters

---

## Testing Steps (How to Verify the Fix)

1. **Run the existing tests**: `npx vitest run`
   - All existing `settlementsApi.test.ts` tests pass with identical request URLs
   - All `api.test.ts` tests pass including 11 new `buildQueryParams` tests
2. **Verify URL equivalence**: The new `buildQueryParams` tests include equivalence checks that confirm the output matches the original inline `URLSearchParams` logic
3. **Edge cases**: Empty params, all-undefined params, single param, multiple params, URL encoding

---

Please kindly review this task. If there are any corrections, improvements, adjustments, or merge conflicts that you notice regarding my implementation, I'd really appreciate your feedback. I'd also love to hear your overall review of my work on this branch. Thank you!
