-- Un pago que la wallet del pagador no completa deja de llamarse "vencido":
-- el vendedor y el pagador necesitan ver que falló, no que se acabó el tiempo.
ALTER TYPE "estado_cobro" ADD VALUE 'fallido';

-- Token del permiso del pagador, solo para consultar su pago saliente.
-- Se borra cuando el cobro se cierra (cobrado o fallido).
ALTER TABLE "cobros" ADD COLUMN "outgoing_token" TEXT;
