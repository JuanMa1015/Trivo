-- Token del link y el QR: 128 bits aleatorios en base64url (22 caracteres).
-- El código de 6 dígitos deja de abrir cobros; solo sirve para encontrar el token.

-- Se agrega sin NOT NULL para poder rellenar los cobros que ya existan.
ALTER TABLE "cobros" ADD COLUMN "token" TEXT;

UPDATE "cobros"
SET "token" = substr(
  translate(
    encode(sha256(convert_to(gen_random_uuid()::text || "id"::text, 'UTF8')), 'base64'),
    '+/=', '-_'),
  1, 22)
WHERE "token" IS NULL;

ALTER TABLE "cobros" ALTER COLUMN "token" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cobros_token_key" ON "cobros"("token");

-- Regla de integridad que Prisma no expresa.
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_token_formato"
  CHECK ("token" ~ '^[A-Za-z0-9_-]{22}$');
