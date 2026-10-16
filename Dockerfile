# syntax=docker/dockerfile:1

# --- Dependencies (cached while package files don't change) ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Scripts are skipped here: `prisma generate` needs the schema and runs in the build stage.
RUN npm ci --ignore-scripts

# --- One-off migrations: `docker compose run --rm migrate` ---
FROM deps AS migrate
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy"]

# --- Build (generates the Prisma client, standalone output, see next.config.ts) ---
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# --- Runtime: only what the standalone server needs, as a non-root user ---
FROM node:24-alpine AS runtime
WORKDIR /app

# Links the package to the repository in GitHub (shows under the repo's Packages).
LABEL org.opencontainers.image.source="https://github.com/JuanMa1015/Trivo" \
      org.opencontainers.image.description="Trivo: simple payments for informal vendors, built on Open Payments"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=9028

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER app
EXPOSE 9028

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9028/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
