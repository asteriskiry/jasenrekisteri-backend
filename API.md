# API contracts

The base path is `/api`. New responses use `{ success: true, message, data }` or `{ success: false, error: { code, message, details? } }`. Some legacy member/admin endpoints still return bare objects or arrays.

Authentication uses an HttpOnly session cookie. Production sets `__Host-jasenrekisteri-session` with Secure, SameSite=Lax and Path=/; HTTP local development uses `jasenrekisteri-session`. Sessions expire absolutely after eight hours and are revocable in MongoDB. Password changes invalidate previous sessions. Legacy login tokens and Authorization headers cannot authenticate. Every API response uses `Cache-Control: no-store`.

Send cookies (`withCredentials: true` for Axios) and `X-Requested-With: XMLHttpRequest` on writes. A supplied Origin/Referer must match `CLIENTURL`. Failed CSRF validation returns 403 with `CSRF_REJECTED`. Only `POST /pay/webhook` is exempt; it requires Stripe signature verification. Missing, expired or revoked sessions return 401.

| Endpoint                       | Contract                                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /login`                  | Body: `email`, `password`. Sets the session cookie; returns `data.id`, `data.role`, `data.expiresAt`. No token in JSON.                                                                                                                                         |
| `GET /session`                 | Requires the session cookie. Returns `data.id`, current `data.role`, and `data.expiresAt`; does not renew expiry.                                                                                                                                               |
| `POST /logout`                 | Revokes the current session and clears cookies. Safe to repeat with no valid session.                                                                                                                                                                           |
| `POST /reset`                  | Body: `userID`, `resetToken`, `password`, `passwordAgain`. Recovery token authorizes the reset without login; invalidates previous sessions.                                                                                                                    |
| `GET /member/details`          | Requires the session cookie. Returns the authenticated member without a password hash; supplied member IDs are ignored.                                                                                                                                         |
| `GET /admin/list`              | Requires the session cookie and the authenticated member's Admin/Board role.                                                                                                                                                                                    |
| `POST /register`               | Person fields. Returns HTTP 200 with `data.memberId` and a one-hour checkout-only `data.paymentToken`, allowing immediate payment with the selected membership product. An existing member email returns 409. No registration confirmation email is required.   |
| `POST /forgot`                 | Body: `email`. Returns the same HTTP 202 response whether an account exists, is cooling down, or mail delivery fails.                                                                                                                                           |
| `PUT /member/details`          | Personal fields; changing password or email additionally requires `currentPassword`. Approved UTU identifiers require an administrator. Email changes stay pending until confirmation.                                                                          |
| `POST /member/email/confirm`   | Requires the member session and body `token` from the new email address. Atomically changes email, consumes the token, revokes sessions and invalidates reset links.                                                                                            |
| `POST /pay`                    | Body: `productId`, UUID `checkoutId`. Authenticate with the member session cookie or body `paymentToken`. Returns `data.url`, `data.sessionId` and sets the receipt cookie. Reuse `checkoutId` for retries of the same attempt.                                 |
| `POST /pay/webhook`            | Raw JSON body plus `stripe-signature`. Handles completed, async success/failure and expired Checkout Sessions.                                                                                                                                                  |
| `GET /pay/session-status`      | Query: `session_id`. Requires the matching unexpired receipt cookie; URL tokens are ignored. Returns `data.state`: `pending`, `complete`, `review`, `failed`, `expired`, or `canceled`; completed payments include `data.paymentData`. Never grants membership. |
| `GET /health` (outside `/api`) | HTTP 200 when connected to MongoDB; otherwise 503.                                                                                                                                                                                                              |

The receipt cookie is scoped to `/api/pay/session-status`, with HttpOnly, SameSite=Lax and Secure on HTTPS or in production. Its absolute 24-hour expiry is enforced by the server and is not renewed on retries. Records without a receipt expiry cannot authorize access. Cross-origin development requests must include credentials and use the configured `CLIENTURL`. Checkout and status responses use `Cache-Control: no-store`.

Payment errors use 400/401/404/409/502/503 as appropriate; invalid webhook signatures return 400 and retryable fulfillment failures return 500.

Development Swagger UI is available at `/api-docs`; `npm run swagger` regenerates its specification.

## Delete expired users

`GET /api/admin/expired` requires **Admin** and returns `data.count` and `data.previewToken` for the confirmation dialog. Expired means a stored `membershipEnds` date at or before the preview time, matching the member list's expiry indicator. The signed-in administrator and accounts with missing/null expiry dates are excluded; all other roles are included. The selection ignores frontend search filters.

`POST /api/admin/remove-expired` requires **Admin** and body `{ previewToken, confirmation: "DELETE" }`. The signed preview is bound to that administrator and expires after ten minutes. Missing or invalid confirmation/preview returns 400. If the selected IDs or expiry dates have changed, the entire operation returns 409 and requires a fresh preview, even if the count is unchanged. Accounts expiring after the preview are not added to that selection.

The body also accepts optional boolean `sendEmail` (default `true`). The confirmation dialog exposes this as a checked-by-default checkbox. Set it to `false` to skip deletion emails to all selected users; non-boolean values return 400 before any deletion. Reopening the dialog resets the checkbox to enabled.

Successful deletion returns `data.count` and `data.deletedIds`. All deletions and per-user `member.deleted` audit snapshots commit in one transaction. Failure rolls everything back; when enabled, normal deletion notifications are sent only after commit. Canceling the dialog sends no deletion request. This removes member accounts using the existing deletion semantics; audit history and historical payment records remain.

## Administrative audit

`GET /api/admin/audit` requires an authenticated **Admin** role and returns `{ success: true, message, data: { entries, nextCursor } }`. Results are ordered by descending entry ID. Optional query parameters are `actorId`, `targetId`, `limit` (1–100, default 50) and `before` (the previous page's `nextCursor`, retaining any actor/target filters). Invalid or unknown filters return 400, unauthorized roles return 403, and responses are not cached.

Entries contain `_id`, `actorId`, `actorName`, `actorRole`, `targetId`, `targetName`, `timestamp`, `action` (`member.created`, `member.updated`, `member.deleted`), `changedFields`, `before`, `after`, and `passwordChanged`. New entries store full names from trusted member records at the time of the action, preserving both IDs. `targetName` uses the name before an edit or deletion, or the saved name on creation. Later name changes and account deletion do not alter these snapshots.

The response also includes `actorNameSource` and `targetNameSource`: `snapshot` means a stored historical name, `current` means a name resolved from a surviving account, and `id` means no complete name was available and the corresponding ID is used as the display value. Older entries use any complete target name in their original before/after snapshot, otherwise current accounts or IDs. This read-time fallback does not modify stored audit records or require a data migration.

Creation and deletion retain controlled member snapshots; updates retain only changed values. Password changes are represented only by the boolean flag. Entries contain no password values, hashes, tokens or request bodies. No-op updates and rejected/failed operations do not create successful-change records. There are no audit mutation endpoints.

Administrative member writes require transaction-capable MongoDB and roll back if the audit insert fails. Creation/update uniqueness conflicts return 409. Removal validates the target ID (400), returns 404 for missing members, and addresses notifications using the stored member email. The request's `email` and audit metadata are ignored.

Password recovery requires matching string passwords of at least six characters. Invalid password submissions return 400 without changing the password or consuming the reset token. Empty password fields on ordinary profile edits continue to mean “leave the password unchanged.”

## Abuse protection and pending records

MongoDB-backed counters are shared across workers and restarts. Limits are per fixed window: login 50/IP and 10/normalized email per 15 minutes; recovery 20/IP per 15 minutes and one/normalized email per five minutes; registration 20/IP and 10/normalized email per 15 minutes; reset 50/IP and 20/member ID per 15 minutes; profile writes 20/member and email confirmation 10/member per 15 minutes. Rejected requests return 429 with Retry-After, except recovery account cooldowns return the same generic 202. Keys are HMAC hashes, and counters expire automatically. Do not expose the API behind a proxy that accepts spoofed client IP headers.

Identical normalized registration submissions reuse a pending record without extending its 24-hour expiry. Corrected details create a separate pending record so they do not replace another submission's checkout details. Checkout enforces expiry without waiting for TTL cleanup and snapshots the registration fields so delayed paid webhooks still fulfill after pending-record cleanup. Existing pre-upgrade pending registrations can still start checkout with an unexpired registration payment token.

Reset links last one hour and are consumed together with the password change in a transaction. After the cooldown, recovery resends the same usable link without extending it. Delivery runs after the generic HTTP response; failures are logged and users can retry after the cooldown. Password changes and confirmed email changes invalidate earlier recovery credentials. Email-change links last one hour, require the same signed-in member and are bound to the password state when issued.
