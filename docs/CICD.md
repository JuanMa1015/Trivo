# CI/CD

## How it works

Workflow: [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml).

| Job           | Runs on             | What it checks or does                                                           |
| ------------- | ------------------- | -------------------------------------------------------------------------------- |
| `ci`          | every PR and push   | lint, types, format, unit tests, production build                                |
| `integration` | every PR and push   | runs `prisma migrate deploy` on a throwaway Postgres and runs its tests          |
| `docker`      | every PR and push   | the image builds                                                                 |
| `publish`     | push to `main` only | builds and pushes `ghcr.io/<owner>/<repo>` (tags `sha-<short>` and `latest`)     |
| `deploy`      | after `publish`     | SSH to the server, pull by digest, replace the container, roll back if unhealthy |

`publish` needs `ci`, `integration` and `docker` to be green, and `deploy` needs `publish`. A red check stops everything after it.

## One-time GitHub setup

### 1. Branch protection for `main`

Settings > Rules > Rulesets (or Branches) > add a rule for `main`:

- Require a pull request before merging.
- Required approvals: **0** (a PR author cannot approve their own PR; the author merges after the checks pass). Raise it when a second person reviews.
- Require status checks to pass, and select **`Lint, types, format, unit tests, build`**, **`Postgres integration tests`** and **`Docker image builds`**.
- Require branches to be up to date before merging.
- Block force pushes and deletions.

### 2. Make the image pullable

The first publish creates the package. Then: your profile > Packages > `trivo` > Package settings > change visibility to **Public** (the repo is public for the hackathon). If you keep it private, run `docker login ghcr.io` once on the server with a token that has `read:packages`.

### 3. Production environment and secrets

Settings > Environments > New environment `production`. Optionally add **Required reviewers** for a manual approval before every deploy. Add these environment secrets:

| Secret               | Value                                                           |
| -------------------- | --------------------------------------------------------------- |
| `DEPLOY_HOST`        | server hostname or IP                                           |
| `DEPLOY_PORT`        | SSH port                                                        |
| `DEPLOY_USER`        | a non-root user that is in the `docker` group                   |
| `DEPLOY_SSH_KEY`     | private key of a dedicated deploy key (never your personal key) |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -p <port> <host>`, fingerprint verified  |

Finally enable deploys: Settings > Secrets and variables > Actions > Variables > `DEPLOY_ENABLED` = `true`. Until then `deploy` is skipped and CI/publish still run.

```bash
# On your machine: dedicated key without passphrase for CI
ssh-keygen -t ed25519 -f ./trivo_deploy -C "trivo-ci" -N ""
ssh-copy-id -i ./trivo_deploy.pub -p <port> <user>@<host>
ssh-keyscan -p <port> <host>     # paste into DEPLOY_KNOWN_HOSTS after checking the fingerprint
gh secret set DEPLOY_SSH_KEY --env production < ./trivo_deploy
rm ./trivo_deploy ./trivo_deploy.pub
```

### 4. Prepare the server (once)

```bash
sudo mkdir -p /opt/trivo
sudo chown "$USER" /opt/trivo
nano /opt/trivo/.env        # runtime config, never committed
chmod 600 /opt/trivo/.env
```

The Open Payments private key goes in `/opt/trivo/open_payments.key` (`chmod 644`, inside `/opt/trivo` with `chmod 700`); `scripts/deploy.sh` mounts it read-only at `/run/secrets/open_payments.key`. See [OPEN-PAYMENTS.md](OPEN-PAYMENTS.md).

`/opt/trivo/.env` holds plain `KEY=value` lines (docker `--env-file` does not strip quotes). There is **no** `DATABASE_URL`: the deploy creates the database itself.

```
COBROS_STORE=postgres
COBROS_RAIL=open-payments
APP_BASE_URL=https://your-domain.example
CONFIRMACION_SECRETO=<64 hex characters, see docs/OPEN-PAYMENTS.md>
OPEN_PAYMENTS_CLIENT_WALLET_URL=https://ilp.interledger-test.dev/your-wallet
OPEN_PAYMENTS_KEY_ID=<key id registered in the wallet>
OPEN_PAYMENTS_PRIVATE_KEY_PATH=/run/secrets/open_payments.key
```

### What a deploy does on the server

`scripts/deploy.sh` runs these steps in order and stops at the first one that fails:

1. Creates the Docker network `trivo`.
2. Creates the Postgres container `trivo-db` **once** (volume `trivo-pgdata`, no published port, reachable only as `db` inside the network). Its password is generated into `/opt/trivo/postgres_password` (`chmod 600`); nobody chooses or pastes it. A deploy never replaces this container, so data survives.
3. Applies Prisma migrations with the published `migrate` image. If they fail, the running app is left untouched.
4. Replaces the app container and rolls back to the previous image if it is not healthy.
5. If `APP_BASE_URL` is `https://…`, starts or reloads the Caddy proxy `trivo-proxy` on ports 80 and 443, which gets and renews the certificate by itself. This needs a DNS **A record** for that domain pointing at the server, with ports 80 and 443 free. If the proxy fails, the deploy still succeeds and prints a warning.

The app also stays reachable on port **9028** (plain HTTP). Use the HTTPS domain for payers.

No domain yet? Set `APP_BASE_URL=http://<server-ip>:9028`. The deploy then skips the proxy and the app is served over plain HTTP: fine for a demo, but links and tokens travel unencrypted, so move to a domain with HTTPS before real use.

Back up the database from time to time:

```bash
docker exec trivo-db pg_dump -U trivo trivo > trivo-$(date +%F).sql
```

## Images in GitHub Packages

Images are published to `ghcr.io/juanma1015/trivo`. The `org.opencontainers.image.source` label (in the Dockerfile and added by the metadata action) links the package to this repository, so it shows under **Packages** in the repo sidebar after the first publish.

| Tag            | Published when           |
| -------------- | ------------------------ |
| `sha-abc1234`  | every merge to `main`    |
| `latest`       | every merge to `main`    |
| `1.2.3`, `1.2` | a `v1.2.3` tag is pushed |

```bash
git switch main && git pull --ff-only
git tag v0.1.0
git push origin v0.1.0
docker pull ghcr.io/juanma1015/trivo:0.1.0
```

## Database migrations

Migrations live in `prisma/migrations` and are applied explicitly, never at app start. From your machine, with the **direct** Supabase connection string (not the transaction pooler):

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

To change the model: edit `prisma/schema.prisma`, run `npm run db:migrate:dev -- --name <change>` against a local database, review the generated SQL and commit it.

## Rollback

`scripts/deploy.sh` keeps the previous image and restarts it automatically if the new container fails its health check (`/api/health`). To go back manually:

```bash
docker run -d --name trivo --restart unless-stopped -p 9028:9028 \
  --env-file /opt/trivo/.env ghcr.io/<owner>/trivo:sha-<previous>
```

## Notes

- Actions are pinned to major versions; Dependabot opens weekly PRs to update them, the npm dependencies and the base image.
- The integration job is the first real run of the Postgres repository: if it fails, the migration or the queries need a fix before merging.
- Secrets live only in GitHub environment secrets and in `/opt/trivo/.env` on the server.
