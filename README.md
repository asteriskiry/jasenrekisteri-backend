# Jäsenrekisteri backend

Asteriski ry's membership register. Requires Node **24.16.0**, npm **11.13.0**, and MongoDB 8. Payment fulfillment requires a replica set.

Author: [Maks Turtiainen](https://github.com/mjturt)

React frontend: <https://github.com/asteriskiry/jasenrekisteri-frontend>.

## Run both applications

Keep `jasenrekisteri-backend` and `jasenrekisteri-frontend` in the same parent directory. From this repository:

```sh
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `.env` as `SECRET`, then:

```sh
docker compose --profile local up --build -d --wait
docker compose exec backend node dist/scripts/create-defaults.js
```

Open <http://localhost:8080>. The explicit demo seed creates `admin@example.com` / `password` and the one- and five-year products. Repeating it preserves existing records; it is disabled in production. Mail stays in [Mailpit](http://localhost:8025). The API is at <http://localhost:3001>; development Swagger UI is at `/api-docs`.

MongoDB data, logs and CSV exports use named volumes. `docker compose down` preserves them. The database has no host port. Both application ports bind to localhost. The single-node replica set provides transactions, not high availability. Existing deployments need a database backup and a deliberate replica-set migration before using this payment implementation.

For production, supply real SMTP settings, `ENV=production`, a random `SECRET`, an HTTPS `CLIENTURL`, and a TLS reverse proxy. Run without the `local` profile. Do not use demo accounts. Deployment automation is a separate stage.

## Stripe

The backend creates hosted Checkout Sessions from local Product prices and snapshots the purchased membership duration. It does not use saved Stripe catalog IDs, so sandbox catalog IDs cannot leak into live checkouts.

1. Select the existing sandbox and obtain a backend key; prefer a restricted key with the permissions needed to create/retrieve Checkout Sessions and their inline prices/products.
2. Run `stripe login`, select that sandbox, and start forwarding:

   ```sh
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to http://localhost:3001/api/pay/webhook
   ```

3. Set `STRIPE_SECRET_KEY`, the listener's `STRIPE_WEBHOOK_SECRET`, and `VITE_USE_PAYMENT=true` in the backend `.env`. Both secrets must be set together. Keep the listener running.
4. Rebuild with `docker compose --profile local up --build -d --wait` and pay through the application. Use Stripe's test card `4242 4242 4242 4242`, a future expiry and any three-digit CVC. Inspect the receipt in Mailpit.

Membership is granted only after server-side verification of a paid Stripe Checkout Session, through a signature-verified webhook or the explicit reconciliation command. The return page reads local status; closing the browser does not interrupt fulfillment. New members set their password through `/forgot` after payment. They still require board approval.

Receipt details require the checkout's HttpOnly cookie. Access expires after 24 hours on both the server and browser; checkout retries do not extend it. Tokens are not returned in JSON or accepted from URLs. Pre-upgrade receipt tokens are rejected; resuming an open checkout issues a fresh cookie. Expiry does not affect payment processing or emailed receipts.

Database failures return HTTP 500 for Stripe retries. Payment completion and membership changes commit together. Email retries cannot extend membership again, but a crash after SMTP acceptance can cause a duplicate email. Inspect `needsManualReview`, `reviewReason`, and `notificationError` on Payment records. Reconcile a session after correcting the underlying problem:

```sh
docker compose exec backend node dist/scripts/reconcile-payment.js cs_...
```

Reconciliation is an operator recovery action for a missed webhook or failed processing attempt. It retrieves the Checkout Session directly from Stripe using the configured backend API credentials and runs the same payment validation and membership update logic as the webhook. It verifies the paid status and matches the session against the local payment record; an already processed payment cannot extend membership again. Run the command from the backend directory with the stack running, replacing `cs_...` with the affected Checkout Session ID.

Legacy records already marked `processed` are not automatically granted again; reconcile their membership history manually. Never clear that flag without checking whether the membership was previously extended.

Before live use, configure the same four events on an HTTPS `/api/pay/webhook` endpoint, using API version `2026-08-26.dahlia`, and supply that endpoint's signing secret plus a live restricted key through deployment secrets. Confirm sandbox checkout, delayed payment, duplicate delivery, and SMTP delivery first. See [Stripe's go-live guide](https://docs.stripe.com/get-started/checklist/go-live).

The [official Stripe skill](.agents/skills/stripe-best-practices/SKILL.md) is vendored with its license and source information.

## Login sessions

Login uses an HttpOnly, SameSite=Lax cookie with an absolute eight-hour expiry. HTTPS deployments use Secure; production uses the host-only `__Host-jasenrekisteri-session` cookie. The signed token contains only member/session identifiers, scope and timing claims. No token or password hash is returned in login JSON. `GET /api/session` returns the current member ID, database role and expiry; the frontend keeps that metadata in memory.

MongoDB stores revocable login sessions in `loginsessions`, with a TTL index for cleanup. Every authenticated request enforces expiry and checks the current member and password fingerprint. Logout revokes the current session; password changes/reset invalidate all prior sessions. Existing 180-day tokens and Authorization-header login credentials are rejected, so deploy the frontend and backend together and expect everyone to sign in again. No member-data migration is required for this change.

All browser API writes, including login/logout, require `X-Requested-With: XMLHttpRequest`. A supplied Origin or Referer must match the configured `CLIENTURL` origin. The shared frontend client sends credentials and the header automatically. Stripe's signature-verified webhook is exempt. Serve the production UI and `/api` under the same HTTPS origin; local development may use different ports on the same hostname. Session and API responses are not cached. The CSRF approach follows [OWASP's custom-header guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi).

## Local development and checks

```sh
npm ci
npm run dev
npm run lint
npm test
```

Set `MONGOURL`, `CLIENTURL`, `SECRET` and SMTP settings in `.env` for a non-container process. `npm test` downloads an isolated MongoDB binary on its first run; it never uses the configured application database or real Stripe account. `npm run build` typechecks and compiles the backend. After the demo stack is running, `node scripts/smoke-compose.mjs` checks routing, authentication and Mailpit delivery.

With the stack running, execute these interactive provisioning commands from the backend directory:

```sh
docker compose exec -it backend node dist/scripts/create-user.js
docker compose exec -it backend node dist/scripts/create-product.js
```

Both commands run inside the backend container using its configured database connection. The product command creates a local Product record; it does not provision a saved Stripe catalog product. The hourly access export is written to `CSVFILEPATH` (`/app/data/kulkuoikeudet_asteriski.csv` in Compose).

## Importing data

With the backend running at `http://localhost:3001`, import a CSV file:

```sh
npm run import -- "<full-path-to-csv>"
```

The command prompts for an administrator's email and masked password, obtains its own short-lived session, imports rows sequentially and logs out afterward. Credentials and cookies are not command-line arguments. Set `IMPORT_API_URL` to use another API base URL, including `/api`; remote URLs must use HTTPS. A failed row stops the import; already saved rows remain saved.

CSV columns must appear in this order, separated by semicolons:

```text
firstname;lastname;utu_mail;membership_approved;membership_ends;hometown;tyy_member;tivia_member;board;
```

This line describes the column order; do **not** include a header row in the file. The importer reads every row as member data. It interprets `membership_approved` as the membership start date and `membership_ends` as the end date, both in `DD.MM.YYYY` format. Use `kyllä` for true in the last three flag columns. The legacy `board` column sets access rights; imported users receive the `Member` role and are marked accepted.

## Mail sending

Send mail to all members with:

```sh
npm run mass-mailer -- -s <subject> -e <path-to-email-body-file>
```

See [API contracts](API.md), the [modernization review](docs/modernization-review.md), and [CI/CD setup](docs/ci-cd.md).

---

© Maks Turtiainen, Asteriski ry
