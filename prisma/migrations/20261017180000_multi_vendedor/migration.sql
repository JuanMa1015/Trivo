-- Un comercio por vendedor, cada uno con su wallet de cobro. No toca los datos existentes:
-- el comercio y los cobros que ya hay siguen siendo de quien los creó (su cuenta, si la registró).
ALTER TABLE "comercios" ADD COLUMN "wallet_url" TEXT;
-- Wallet en la que se cobró cada cobro (foto del momento). Nula = la wallet de la plataforma.
ALTER TABLE "cobros" ADD COLUMN "wallet_receptora" TEXT;

ALTER TABLE "comercios" ADD CONSTRAINT "comercios_wallet_https"
  CHECK ("wallet_url" IS NULL OR "wallet_url" LIKE 'https://%');
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_wallet_https"
  CHECK ("wallet_receptora" IS NULL OR "wallet_receptora" LIKE 'https://%');

-- El usuario es único sin importar mayúsculas ("Ana" y "ana" serían la misma persona).
CREATE UNIQUE INDEX "comercios_usuario_lower_key" ON "comercios" (lower("usuario"));
