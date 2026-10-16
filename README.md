# Trivo

Cobros simples para vendedores informales. El vendedor teclea un monto y cobra con un código, un QR o un link; cada cobro se convierte en historial de ventas. El pagador ve el precio (incluso convertido a su moneda) y aprueba en su propia wallet, sobre [Open Payments](https://openpayments.dev).

Simple payments for informal vendors: type an amount, collect with a code, QR or link, and every sale becomes a sales history. The payer sees the exact price (converted to their currency if needed) and approves in their own wallet, built on Open Payments.

Full product and design context: [docs/CONTEXTO-DISENO.md](docs/CONTEXTO-DISENO.md).

## Run locally

```bash
nvm use            # Node 24 (.nvmrc)
npm ci
cp .env.example .env.local
npm run dev -- -p 9028
```

Open http://localhost:9028. By default data lives in memory (`COBROS_STORE=memoria`). To use Postgres, set `DATABASE_URL`, run `npm run db:migrate` and set `COBROS_STORE=postgres`. With Docker Desktop, see the commands below.

## Docker Desktop

```bash
docker compose up -d db               # Postgres 16 on localhost:5432
docker compose run --rm migrate       # apply Prisma migrations
docker compose up --build app         # http://localhost:9028
docker compose logs -f app            # follow logs

docker compose down                   # stop (add -v to wipe the database)
```

The database is also reachable from your machine on port **5433** (`DB_PORT` changes it), e.g. `DATABASE_URL=postgresql://trivo:trivo@localhost:5433/trivo`. If Docker says the port is not available, pick another one: `DB_PORT=5434 docker compose up -d db`.

Run the published image instead of building it:

```bash
docker run --rm -p 9028:9028 ghcr.io/juanma1015/trivo:latest
```

## Scripts

| Command              | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run check`      | Lint, types, format and unit tests (same as CI) |
| `npm test`           | Vitest. Postgres tests need `TEST_DATABASE_URL` |
| `npm run build`      | Production build (standalone output)            |
| `npm run db:migrate` | Apply Prisma migrations to `DATABASE_URL`       |
| `npm run db:studio`  | Browse the database with Prisma Studio          |

## Open Payments

Two rails, chosen with `COBROS_RAIL`: `demo` (simulated payment, default) and `open-payments` (real payments on the Interledger testnet). Flow, configuration and security notes: [docs/OPEN-PAYMENTS.md](docs/OPEN-PAYMENTS.md).

## CI/CD

Every pull request runs lint, type check, format check, unit tests, Postgres integration tests and a Docker build. Merging to `main` publishes the image to GitHub Container Registry and, if enabled, deploys it. Setup and branch protection: [docs/CICD.md](docs/CICD.md).

## Rules

- No secrets in the repo (`.env*`, `private.key`).
- AI usage is documented in [AI_USAGE.md](AI_USAGE.md) and [prompts/](prompts).
