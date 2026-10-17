-- Cuenta del comercio: usuario y contraseña (hash scrypt). Se agregan sin obligar a nadie:
-- el comercio se registra más tarde, cuando la app se lo pide.
ALTER TABLE "comercios" ADD COLUMN "usuario" TEXT;
ALTER TABLE "comercios" ADD COLUMN "password_hash" TEXT;

CREATE UNIQUE INDEX "comercios_usuario_key" ON "comercios"("usuario");

-- Reglas de integridad que Prisma no expresa: usuario y contraseña van juntos y el hash tiene su formato.
ALTER TABLE "comercios" ADD CONSTRAINT "comercios_cuenta_completa"
  CHECK (("usuario" IS NULL) = ("password_hash" IS NULL));
ALTER TABLE "comercios" ADD CONSTRAINT "comercios_hash_formato"
  CHECK ("password_hash" IS NULL OR "password_hash" LIKE 'scrypt$%');
