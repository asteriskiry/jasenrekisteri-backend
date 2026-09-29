# API contracts

The base path is `/api`. New responses use `{ success: true, message, data }` or `{ success: false, error: { code, message, details? } }`. Some legacy member/admin endpoints still return bare objects or arrays.

| Endpoint                       | Contract                                                                                                                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /login`                  | Body: `email`, `password`. Returns `data.token`, `data.id`, `data.role`.                                                                                                                                                                      |
| `GET /member/details`          | `Authorization: JWT …`. Returns the authenticated member without a password hash; supplied member IDs are ignored.                                                                                                                            |
| `GET /admin/list`              | Same authorization header. Requires the authenticated member's Admin/Board role.                                                                                                                                                              |
| `POST /register`               | Person fields. Returns `data.memberId` and a one-hour `data.paymentToken` scoped to checkout.                                                                                                                                                 |
| `POST /pay`                    | Body: `productId`, UUID `checkoutId`. Authenticate with a member JWT or body `paymentToken`. Returns `data.url`, `data.sessionId`, `data.stamp`. Reuse `checkoutId` for retries of the same attempt.                                          |
| `POST /pay/webhook`            | Raw JSON body plus `stripe-signature`. Handles completed, async success/failure and expired Checkout Sessions.                                                                                                                                |
| `GET /pay/session-status`      | Query: `session_id`, plus private `stamp` or the matching checkout cookie. Returns `data.state`: `pending`, `complete`, `review`, `failed`, `expired`, or `canceled`; completed payments include `data.paymentData`. Never grants membership. |
| `GET /health` (outside `/api`) | HTTP 200 when connected to MongoDB; otherwise 503.                                                                                                                                                                                            |

Checkout also sets a per-session, 24-hour HttpOnly cookie scoped to `/api/pay/session-status`, with SameSite=Lax and Secure on HTTPS or in production. It provides receipt access if tab storage is lost. Cross-origin development requests must include credentials and use the configured `CLIENTURL`. Stamps stay outside redirect URLs; checkout and status responses use `Cache-Control: no-store`.

Payment errors use 400/401/404/409/502/503 as appropriate; invalid webhook signatures return 400 and retryable fulfillment failures return 500.

Development Swagger UI is available at `/api-docs`; `npm run swagger` regenerates its specification.
