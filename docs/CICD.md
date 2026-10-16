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

`/opt/trivo/.env` holds plain `KEY=value` lines (docker `--env-file` does not strip quotes):

```
COBROS_STORE=postgres
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
```

The app listens on port **9028**. Open it in the firewall only if you serve it directly; behind a reverse proxy, keep it on localhost.

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
