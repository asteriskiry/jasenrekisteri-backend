# Jäsenrekisteri backend

Asteriski ry's membership register. Requires Node **24.16.0**, npm **11.13.0**, and MongoDB 8. Payment fulfillment requires a replica set.

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

Only signed paid events grant membership. The return page reads local status; closing the browser does not interrupt fulfillment. New members set their password through `/forgot` after payment. They still require board approval.

Database failures return HTTP 500 for Stripe retries. Payment completion and membership changes commit together. Email retries cannot extend membership again, but a crash after SMTP acceptance can cause a duplicate email. Inspect `needsManualReview`, `reviewReason`, and `notificationError` on Payment records. Reconcile a session after correcting the underlying problem:

```sh
docker compose exec backend node dist/scripts/reconcile-payment.js cs_...
```

Legacy records already marked `processed` are not automatically granted again; reconcile their membership history manually. Never clear that flag without checking whether the membership was previously extended.

Before live use, configure the same four events on an HTTPS `/api/pay/webhook` endpoint, using API version `2026-08-26.dahlia`, and supply that endpoint's signing secret plus a live restricted key through deployment secrets. Confirm sandbox checkout, delayed payment, duplicate delivery, and SMTP delivery first. See [Stripe's go-live guide](https://docs.stripe.com/get-started/checklist/go-live).

The [official Stripe skill](.agents/skills/stripe-best-practices/SKILL.md) is vendored with its license and source information.

## Local development and checks

```sh
npm ci
npm run dev
npm run lint
npm test
```

Set `MONGOURL`, `CLIENTURL`, `SECRET` and SMTP settings in `.env` for a non-container process. `npm test` downloads an isolated MongoDB binary on its first run; it never uses the configured application database or real Stripe account. `npm run build` typechecks and compiles the backend. After the demo stack is running, `node scripts/smoke-compose.mjs` checks routing, authentication and Mailpit delivery.

Use `docker compose exec -it backend node dist/scripts/create-user.js` and `node dist/scripts/create-product.js` to provision real records. Other utilities: `npm run import -- <csv-path> <token> <id>` and `npm run mass-mailer -- -s <subject> -e <body-file>`. The hourly access export is written to `CSVFILEPATH` (`/app/data/kulkuoikeudet_asteriski.csv` in Compose).

See [API contracts](API.md) and the [modernization review](docs/modernization-review.md).
