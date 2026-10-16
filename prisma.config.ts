import { defineConfig } from "prisma/config";

// El CLI de Prisma no lee .env por sí mismo; Node 24 sí puede cargarlo.
try {
  process.loadEnvFile(".env");
} catch {
  // Sin .env: se usa lo que ya haya en el entorno (CI, Docker).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // `prisma generate` no necesita conexión; migrate sí, y falla claro si falta.
    url: process.env.DATABASE_URL ?? "",
  },
});
