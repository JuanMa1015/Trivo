# Uso de IA

Requisito del hackatón: herramientas usadas, para qué, en qué archivos y qué se escribió a mano. Los prompts completos están en [`/prompts`](./prompts).

## Herramientas

| Herramienta                      | Para qué                                                                |
| -------------------------------- | ----------------------------------------------------------------------- |
| Claude (Claude Code, escritorio) | Mentoría, diseño de la idea, andamiaje del proyecto, revisión de código |

## Qué generó la IA

| Archivos / funciones                                                                | Qué hizo la IA                                                                              | Revisado por |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `src/app/*` | Esqueleto generado con `create-next-app`; scripts y `output: "standalone"` ajustados con IA |              |
| `src/lib/env.ts`, `src/lib/env.test.ts`                                             | Validación de variables de entorno con zod y sus tests                                      |              |
| `.prettierrc.json`, `vitest.config.ts`, `.env.example`, `.gitignore`                | Configuración de herramientas y de secretos                                                 |              |
| `prompts/`, `AI_USAGE.md`                                                           | Plantillas de documentación                                                                 |              |
| `src/components/*`, `src/app/*` (pantallas), `src/lib/talonario.ts`, `DESIGN.md`    | Diseño y construcción del flujo de cobro (talonario, cobro, pago) con la skill de diseño    |              |
| `src/lib/cobros.ts`, `src/lib/topes.ts`, `src/lib/conversion.ts`                    | Dominio: estados, vencimiento, trazabilidad, topes tributarios, conversión de ejemplo       |              |
| `src/server/*`, `src/app/api/*`, `db/migrations/0001_cobros.sql`                    | API, repositorio en memoria y Postgres, límite de intentos, migración SQL                   |              |
| `Dockerfile`, `.github/*`, `scripts/deploy.sh`, `docs/*`, `README.md`               | Contenedor, CI/CD, despliegue con rollback, documentación                                   |              |

## Qué se escribió a mano

_Completar por el equipo a medida que avance el proyecto._

## Reglas del equipo

- Ningún secreto en el repo (`private.key`, `.env*`).
- Todo cambio generado por IA se revisa antes de hacer commit.
