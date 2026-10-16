-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "tipo_evento" ADD VALUE 'cotizado';
ALTER TYPE "tipo_evento" ADD VALUE 'consentimiento_iniciado';
ALTER TYPE "tipo_evento" ADD VALUE 'pago_enviado';
ALTER TYPE "tipo_evento" ADD VALUE 'pago_fallido';

-- CreateTable
CREATE TABLE "intentos_pago" (
    "id" UUID NOT NULL,
    "cobro_id" UUID NOT NULL,
    "wallet_pagador" TEXT NOT NULL,
    "nombre_pagador" TEXT,
    "quote_url" TEXT NOT NULL,
    "debito_valor" TEXT NOT NULL,
    "debito_codigo" TEXT NOT NULL,
    "debito_escala" INTEGER NOT NULL,
    "recibe_valor" TEXT NOT NULL,
    "recibe_codigo" TEXT NOT NULL,
    "recibe_escala" INTEGER NOT NULL,
    "continue_uri" TEXT,
    "continue_token" TEXT,
    "nonce_cliente" TEXT,
    "nonce_as" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "intentos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intentos_pago_cobro_id_idx" ON "intentos_pago"("cobro_id");

-- AddForeignKey
ALTER TABLE "intentos_pago" ADD CONSTRAINT "intentos_pago_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Reglas de integridad que Prisma no expresa (infraestructura de la base).
-- ---------------------------------------------------------------------------

-- Los intentos guardan el token de continuación del grant: nadie fuera del
-- servidor debe verlos. Con RLS activa y sin políticas, la API pública de
-- Supabase (claves anon y authenticated) no ve ni una fila.
ALTER TABLE "intentos_pago" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "intentos_pago" ADD CONSTRAINT "intentos_pago_wallet_https"
  CHECK ("wallet_pagador" ~ '^https://');
ALTER TABLE "intentos_pago" ADD CONSTRAINT "intentos_pago_importes_enteros"
  CHECK ("debito_valor" ~ '^[0-9]+$' AND "recibe_valor" ~ '^[0-9]+$');
