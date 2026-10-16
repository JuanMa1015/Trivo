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

## Qué se escribió a mano

_Completar por el equipo a medida que avance el proyecto._

## Reglas del equipo

- Ningún secreto en el repo (`private.key`, `.env*`).
- Todo cambio generado por IA se revisa antes de hacer commit.
