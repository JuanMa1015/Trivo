-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "estado_cobro" AS ENUM ('esperando', 'procesando', 'cobrado', 'vencido');

-- CreateEnum
CREATE TYPE "tipo_evento" AS ENUM ('creado', 'compartido_whatsapp', 'link_copiado', 'abierto_por_pagador', 'aprobacion_iniciada', 'cobrado', 'vencido');

-- CreateTable
CREATE TABLE "comercios" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comercios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros" (
    "id" UUID NOT NULL,
    "comercio_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "codigo" CHAR(6) NOT NULL,
    "monto" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL DEFAULT '',
    "estado" "estado_cobro" NOT NULL DEFAULT 'esperando',
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMPTZ(3) NOT NULL,
    "pagado_en" TIMESTAMPTZ(3),
    "incoming_payment_url" TEXT,
    "quote_url" TEXT,
    "outgoing_payment_url" TEXT,

    CONSTRAINT "cobros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" BIGSERIAL NOT NULL,
    "cobro_id" UUID NOT NULL,
    "tipo" "tipo_evento" NOT NULL,
    "detalle" TEXT,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cobros_comercio_id_creado_en_idx" ON "cobros"("comercio_id", "creado_en" DESC);

-- CreateIndex
CREATE INDEX "cobros_estado_vence_en_idx" ON "cobros"("estado", "vence_en");

-- CreateIndex
CREATE UNIQUE INDEX "cobros_comercio_id_numero_key" ON "cobros"("comercio_id", "numero");

-- CreateIndex
CREATE INDEX "eventos_cobro_id_creado_en_idx" ON "eventos"("cobro_id", "creado_en");

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_comercio_id_fkey" FOREIGN KEY ("comercio_id") REFERENCES "comercios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Reglas de integridad que Prisma no expresa (infraestructura de la base).
-- La aplicación no contiene SQL: todo acceso pasa por Prisma Client.
-- ---------------------------------------------------------------------------

-- Valores válidos, validados también en la base.
ALTER TABLE "comercios" ADD CONSTRAINT "comercios_nombre_largo"
  CHECK (char_length("nombre") BETWEEN 1 AND 80);

ALTER TABLE "cobros" ADD CONSTRAINT "cobros_codigo_formato"
  CHECK ("codigo" ~ '^[0-9]{6}$');
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_monto_rango"
  CHECK ("monto" > 0 AND "monto" <= 999999999);
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_concepto_largo"
  CHECK (char_length("concepto") <= 30);
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_vence_despues_de_crear"
  CHECK ("vence_en" > "creado_en");
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_cobrado_tiene_fecha_de_pago"
  CHECK (("estado" = 'cobrado') = ("pagado_en" IS NOT NULL));

ALTER TABLE "eventos" ADD CONSTRAINT "eventos_detalle_largo"
  CHECK ("detalle" IS NULL OR char_length("detalle") <= 300);

-- Un código en uso no puede repetirse (el pagador lo busca solo por código).
CREATE UNIQUE INDEX "cobros_codigo_en_uso"
  ON "cobros" ("codigo") WHERE "estado" IN ('esperando', 'procesando');

-- La primera apertura del pagador se registra una sola vez, aunque lleguen dos a la vez.
CREATE UNIQUE INDEX "eventos_una_apertura_por_cobro"
  ON "eventos" ("cobro_id") WHERE "tipo" = 'abierto_por_pagador';

-- Trazabilidad que no se puede reescribir: los eventos solo se agregan.
CREATE FUNCTION "eventos_solo_agregar"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'eventos es de solo agregar (no se actualiza ni se borra)';
END;
$$;

CREATE TRIGGER "eventos_inmutables"
  BEFORE UPDATE OR DELETE ON "eventos"
  FOR EACH ROW EXECUTE FUNCTION "eventos_solo_agregar"();

-- Solo el servidor toca estas tablas. Con RLS activa y sin políticas, la API pública
-- de Supabase (claves anon y authenticated) no ve ni una fila.
ALTER TABLE "comercios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cobros"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "eventos"   ENABLE ROW LEVEL SECURITY;
