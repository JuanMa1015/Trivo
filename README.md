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

Open http://localhost:9028. By default data lives in memory (`COBROS_STORE=memoria`). To use Postgres, apply `db/migrations/0001_cobros.sql` and set `COBROS_STORE=postgres` with `DATABASE_URL`.

## Scripts

| Command         | What it does                                    |
| --------------- | ----------------------------------------------- |
| `npm run check` | Lint, types, format and unit tests (same as CI) |
| `npm test`      | Vitest. Postgres tests need `TEST_DATABASE_URL` |
| `npm run build` | Production build (standalone output)            |

## CI/CD

Every pull request runs lint, type check, format check, unit tests, Postgres integration tests and a Docker build. Merging to `main` publishes the image to GitHub Container Registry and, if enabled, deploys it. Setup and branch protection: [docs/CICD.md](docs/CICD.md).

## Rules

- No secrets in the repo (`.env*`, `private.key`).
- AI usage is documented in [AI_USAGE.md](AI_USAGE.md) and [prompts/](prompts).
