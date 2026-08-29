# API client resilience audit

This document records the pre-change audit and the policy implemented for
issue [#433](https://github.com/AnchorNet-Org/AnchorNet-Frontend/issues/433).
It is intentionally limited to the shared API client, its existing error
reporting/toast path, and deterministic unit coverage.

## Behaviour before this change

`apiRequest` and `apiTextRequest` allowed two retries after the initial call,
so a request could produce at most three fetches.

| Failure | GET/HEAD | Other methods | Backoff before this change |
| --- | --- | --- | --- |
| Any HTTP 5xx | Retried | Not retried | Exponential equal jitter |
| Any HTTP 4xx, including 408/429 | Not retried | Not retried | None |
| Fetch/network rejection | Retried unless it was `AbortError` | Not retried | Fixed 500/1000 ms |
| Client timeout | Not retried | Not retried | None |
| Successful response with malformed JSON | Not retried | Not retried | None |
| Caller abort | Not retried | Not retried | None |

Abort was only partially distinguished before this change. A fetch-path
`DOMException` named `AbortError` bypassed retries, but there was no shared
`aborted` category or uniform UI contract. An `Error` carrying the same name
was not recognized, and component-level catches could still render a
deliberate cancellation as an ordinary failure.

The existing `api.test.ts` covered 400, 404 classification by status, 503
success/exhaustion, GET network failures, POST non-retry behaviour, caller
abort, timeout classification, abort during backoff, malformed JSON, and the
jitter helper. It did not establish a status allowlist, timeout retries,
response-body cancellation, an elapsed ceiling, semantic idempotency for the
quote POST, or integration with user-visible error handling.

## Defects found

1. Timeout and caller-abort cleanup ran as soon as response headers arrived,
   before `json()` or `text()` consumed the body. A stalled body therefore had
   no timeout and could survive component unmount.
2. Client timeouts were immediately surfaced instead of retried for an
   idempotent operation.
3. Every 5xx response was retried, including permanent failures such as 501
   and 505.
4. Network failures used fixed delays, so clients affected by the same outage
   could retry in lockstep despite the existing jitter design.
5. Network failures remained untyped `TypeError` values, while HTTP, timeout,
   invalid-response, and abort failures followed different paths.
6. Abort recognition accepted only `DOMException`, while some fetch-compatible
   environments represent an abort as an `Error` named `AbortError`.
7. Timeout inputs were not validated. Negative, fractional, non-finite, or
   overflowing values could be coerced by the platform timer and invalidate
   the documented elapsed ceiling.
8. `QuoteForm` had no abort-specific UI branch. The first taxonomy integration
   also converted `apiErrorMessage(...) === null` back into `"Quote failed."`
   through a fallback. The adversarial regression test exposed this before
   finalization; the component now returns to its idle state without rendering
   an error.

## Implemented retry policy

The retry count, 500 ms exponential base, and equal-jitter algorithm are
unchanged. The same deliberate jitter is now applied consistently to every
retryable transport failure.

An operation declared idempotent can retry only:

- network failures;
- client timeouts;
- HTTP 408, 500, 502, 503, and 504.

All other HTTP responses are non-retryable. In particular, 400, 401, 403, 404,
409, 413, 422, 429, 501, and 505 stop after one call.

GET and HEAD are idempotent by default. `requestQuote` opts in explicitly
because it performs a calculation without mutating server state. Anchor
registration and settlement open/execute/cancel remain non-retryable.
`deregisterAnchor` also remains conservative in this change: despite using
DELETE, it requires an explicit backend contract before client retry is
enabled. No frontend retry relies on the backend's per-process idempotency
cache.

This follows
[RFC 9110 section 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2):
a client should not automatically retry a non-idempotent method unless it
knows the operation semantics are idempotent or knows the first request was
not applied.

## Retry bound

- Maximum retries: 2.
- Maximum fetch attempts: 3.
- Per-attempt timeout includes receiving and consuming the response body.
- Retry delays remain `[500, 1000)` ms and `[1000, 2000)` ms.
- Conservative configured ceiling:
  `3 * perAttemptTimeout + 3000 ms`.
- With the default 10-second timeout, the configured ceiling is 33 seconds.
- Timeout configuration must be a safe integer from 0 through 2,147,483,647
  milliseconds, matching the platform timer's supported range.

The ceiling is a timer-based client budget. As with browser timers generally,
JavaScript that blocks the event loop can delay delivery of an abort event;
the client does not claim a stronger wall-clock guarantee than the platform
provides.

The validation boundary follows the browser timer contract: delays are
integer millisecond values and values above 2,147,483,647 milliseconds can
overflow. See
[MDN: `setTimeout()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#maximum_delay_value).

Keeping the signal active through body consumption matches the documented
Fetch behaviour: aborting after `fetch()` resolves but before the body is read
must make body consumption reject with `AbortError`.
[MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#canceling_a_request)

## Error taxonomy and UI path

| Kind | Component behaviour | Reporting/toast behaviour |
| --- | --- | --- |
| `aborted` | Expected control flow | Neither reported nor displayed |
| `timeout` | May offer retry | Stable timeout message; reported after exhaustion |
| `network` | May offer retry | Stable connectivity message; reported after exhaustion |
| `not_found` | Render resource-specific 404 state | No automatic retry |
| `invalid_response` | Render incompatible-response state | Safe message and operational report |
| `client` | Preserve actionable API validation/conflict message | No automatic retry |
| `server` | Render temporary-service failure | Safe message, request reference, operational report |
| `unknown` | Preserve an existing `Error` message or use a caller fallback | No transport retry |

A failure while consuming a successful JSON or text body is classified as
`invalid_response`, not as a fresh network attempt. The Fetch API may use a
`TypeError` for a locked/disturbed body or decoding failure as well as parsing
failures, so retrying solely from the JavaScript exception class would be
unsafe. See [MDN: `Response.json()`](https://developer.mozilla.org/en-US/docs/Web/API/Response/json#exceptions)
and [MDN: `Response.text()`](https://developer.mozilla.org/en-US/docs/Web/API/Response/text#exceptions).

`ApiRequestError` carries the kind, retryability, attempts, status/code when
available, request ID, and original transport cause. `toast.ts` owns the
user-facing mapping. `errorReporter.ts` enriches operational reports with the
same metadata. `ToastProvider.notifyError` composes these existing mechanisms
and returns early for an abort, proving cancellation cannot create a visible
toast. Inline consumers, including `QuoteForm`, also guard the `null` result
before entering an error state.

The related `useAsync` test work remains in issue
[#426](https://github.com/AnchorNet-Org/AnchorNet-Frontend/issues/426); its own
tests and implementation are not changed here.

## Deterministic verification

Retry tests use Vitest fake timers and a controlled `Math.random`; they do not
wait for real backoff. They cover the status policy, network and timeout
exhaustion, response-body timeout/abort, semantic quote retry, conservative
DELETE behaviour, JSON/text parity, abort suppression, and the elapsed budget.

The official Vitest timer API used by the tests is documented at
[Vitest: Mocking Timers](https://vitest.dev/guide/mocking/timers).

## Baseline constraints observed during verification

The full Vitest suite passes all 61 test files (the original 59 plus focused
coverage for the two settlement consumers changed here). The repository-wide
coverage command still fails its global 95% threshold because production
route and component files that predate this change are untested; this change
does not weaken that threshold. Changed executable lines are covered at
98.84% (255/258). The focused API/taxonomy report reaches 99.19%
statements/lines, 96.92% branches, and 100% functions.

`npx tsc --noEmit` also has pre-existing errors in `MetricsBar.test.tsx`
(incomplete `useAsync` mocks, tracked separately in issue #429) and
`SettlementTable.test.tsx` (`Element` passed to helpers expecting
`HTMLElement`). No resilience implementation file adds a TypeScript error,
and these unrelated tests are intentionally not modified by issue #433.
