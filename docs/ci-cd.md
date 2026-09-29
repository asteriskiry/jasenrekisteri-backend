# CI/CD

Both repositories have a `CI / check` job for pull requests and pushes to `dev`, `dev-cicd` and `master`, plus manual dispatch. It runs `npm ci`, lint, tests and a production Docker build. Backend tests include TypeScript compilation and use an isolated MongoDB replica set; no Stripe secrets are needed. Actions and Docker images are pinned to immutable revisions.

After the user pushes these local branches, require `CI / check` in each repository's branch protection. The workflows were validated locally with actionlint; GitHub execution has not occurred.

The obsolete frontend rsync deployment was removed because it deployed CRA's `build/` directory and bypassed these checks. Image publication and deployment remain unconfigured pending the deployment choice.

The proposed final stage is one manually triggered Compose deployment for both repositories. It needs:

- Deployment host, SSH user/port, installation directory, and verified host key.
- An environment name and approval policy, plus the backend/frontend revisions to release together.
- Server-side application/Stripe/SMTP secrets, TLS routing, and the existing database migration/backup plan.
- A rollback policy using the previous paired images while retaining database volumes.

Keep credentials in GitHub environment secrets or the server's secret store. Do not add them to either repository. No production connection, registry push or deployment has been attempted.
