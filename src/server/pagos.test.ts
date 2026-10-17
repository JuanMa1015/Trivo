import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import {
  PAGO_SIN_CONFIRMAR_MS,
  TOKEN_RE,
  VENCE_EN_MS,
  type Monto,
} from "@/lib/cobros";
import {
  crearRepoIntentosMemoria,
  crearRepoMemoria,
} from "./cobros-repo-memoria";
import { ErrorPago } from "./open-payments/errores";
import type { DatosWallet, PuertoOpenPayments } from "./open-payments/puerto";
import { crearServicioDemo, crearServicioOpenPayments } from "./pagos";

const T0 = Date.parse("2026-10-16T15:00:00.000Z");
const SECRETO = "s".repeat(32);
const RECEPTORA = "https://ilp.interledger-test.dev/test-open";
const PAGADOR = "https://ilp.interledger-test.dev/unabot-jose-usd";
const AUTH_PAGADOR = "https://auth.interledger-test.dev/pagador";

const config = {
  receptoraWalletUrl: RECEPTORA,
  hostsPermitidos: ["ilp.interledger-test.dev"],
  appBaseUrl: "https://trivo.test",
};

function wallet(
  url: string,
  nombre: string,
  codigo: string,
  authServer: string,
): DatosWallet {
  return {
    url,
    nombre,
    codigo,
    escala: 2,
    authServer,
    resourceServer: "https://ilp.interledger-test.dev/recursos",
  };
}

/** Puerto de Open Payments en memoria, con interruptores para provocar cada caso. */
function crearPuertoFalso(ahora: () => number) {
  const incoming = new Map<string, Monto>();
  const control = {
    receptoraCodigo: "COP",
    recibeFalso: undefined as Monto | undefined,
    llegoElDinero: false,
    falloAlCompletar: false,
    pagoSalienteFallido: false,
    consultasSalientes: [] as string[],
    descripciones: [] as (string | undefined)[],
    completados: [] as string[],
    consultas: 0,
  };

  const puerto: PuertoOpenPayments = {
    async leerWallet(url) {
      if (url === RECEPTORA) {
        return wallet(
          url,
          "Test_Open",
          control.receptoraCodigo,
          "https://auth.interledger-test.dev/receptora",
        );
      }
      if (url === PAGADOR)
        return wallet(url, "Unabot Jose", "USD", AUTH_PAGADOR);
      throw new ErrorPago("wallet_invalida");
    },
    async crearCobro({ monto, descripcion }) {
      control.descripciones.push(descripcion);
      const incomingPaymentUrl = `https://ilp.interledger-test.dev/recursos/incoming/${incoming.size + 1}`;
      incoming.set(incomingPaymentUrl, monto);
      return { incomingPaymentUrl };
    },
    async cotizar({ incomingPaymentUrl }) {
      return {
        quoteUrl: "https://ilp.interledger-test.dev/recursos/quotes/1",
        debito: { valor: "1574", codigo: "USD", escala: 2 },
        recibe: control.recibeFalso ?? incoming.get(incomingPaymentUrl)!,
        venceEn: new Date(ahora() + 5 * 60_000).toISOString(),
      };
    },
    async iniciarConsentimiento() {
      return {
        redirectUrl: "https://auth.interledger-test.dev/interact/abc",
        continueUri: "https://auth.interledger-test.dev/continue/abc",
        continueToken: "TOKEN-DE-CONTINUACION",
        nonceAs: "NONCE-AS",
      };
    },
    async completarConsentimiento({ interactRef }) {
      if (control.falloAlCompletar) throw new ErrorPago("open_payments_fallo");
      control.completados.push(interactRef);
      return {
        outgoingPaymentUrl:
          "https://ilp.interledger-test.dev/recursos/outgoing/1",
        accessToken: "TOKEN-DEL-PAGO",
      };
    },
    async consultarPagoSaliente({ accessToken }) {
      control.consultasSalientes.push(accessToken);
      return { fallido: control.pagoSalienteFallido };
    },
    async consultarRecibido({ esperado }) {
      control.consultas += 1;
      return {
        recibido: control.llegoElDinero
          ? esperado
          : { ...esperado, valor: "0" },
        completo: control.llegoElDinero,
      };
    },
  };
  return { puerto, control };
}

function montarReal(tasaReferencia?: () => Promise<number | null>) {
  let t = T0;
  const ahora = () => t;
  const repo = crearRepoMemoria(ahora, {
    completarDemo: false,
    semilla: false,
  });
  const intentos = crearRepoIntentosMemoria();
  const { puerto, control } = crearPuertoFalso(ahora);
  const servicio = crearServicioOpenPayments({
    repo,
    intentos,
    puerto,
    config,
    ahora,
    secreto: () => SECRETO,
    tasaReferencia,
  });
  return {
    servicio,
    repo,
    intentos,
    control,
    avanzar: (ms: number) => {
      t += ms;
    },
  };
}

/** El hash que mandaría el servidor de autorización de la wallet al regresar el navegador. */
const hashDe = (nonceCliente: string, interactRef: string) =>
  createHash("sha256")
    .update(`${nonceCliente}\nNONCE-AS\n${interactRef}\n${AUTH_PAGADOR}`)
    .digest("base64");

/** Recorre cobro -> cotización -> consentimiento y devuelve lo necesario para el retorno. */
async function llegarAlConsentimiento(m: ReturnType<typeof montarReal>) {
  const cobro = await m.servicio.crearCobro(50_000, "Ropa");
  const cotizacion = await m.servicio.cotizar(cobro.token, PAGADOR);
  const aprobacion = await m.servicio.aprobar(
    cobro.token,
    cotizacion.intentoId,
  );
  return { cobro, cotizacion, aprobacion };
}

const codigoDe = (promesa: Promise<unknown>) =>
  promesa.then(
    () => undefined,
    (e: unknown) => (e instanceof ErrorPago ? e.codigo : "otro"),
  );

describe("servicio Open Payments: cobrar", () => {
  it("crea el incoming payment en COP con el monto en unidades menores", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "Ropa");
    expect(cobro.incomingPaymentUrl).toMatch(/incoming\/1$/);
    expect((await m.servicio.obtener(cobro.numero))?.estado).toBe("esperando");
  });

  it("no cobra si la wallet receptora no está en COP", async () => {
    const m = montarReal();
    m.control.receptoraCodigo = "USD";
    expect(await codigoDe(m.servicio.crearCobro(50_000, ""))).toBe(
      "moneda_no_soportada",
    );
  });

  it("no existe el pago simulado: nadie da un cobro por pagado sin dinero", async () => {
    const m = montarReal();
    expect(m.servicio.modo).toBe("open-payments");
    const cobro = await m.servicio.crearCobro(50_000, "");
    expect(await m.servicio.simularPago(cobro.numero)).toMatchObject({
      ok: false,
    });
    expect((await m.servicio.obtener(cobro.numero))?.estado).toBe("esperando");
  });

  it("el pagador ve el nombre que la wallet receptora declara", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "Ropa");
    const pago = await m.servicio.verComoPagador(cobro.token);
    expect(pago?.receptor).toBe("Test_Open");
    expect(Object.keys(pago ?? {}).sort()).toEqual([
      "comercio",
      "concepto",
      "estado",
      "monto",
      "receptor",
      "receptorWallet",
      "venceEn",
    ]);
    expect(pago?.receptorWallet).toBe(RECEPTORA);
  });
});

describe("servicio Open Payments: cotizar", () => {
  it("devuelve el precio real, el nombre del pagador y deja constancia", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "");
    const cot = await m.servicio.cotizar(cobro.token, PAGADOR);
    expect(cot).toMatchObject({
      receptor: "Test_Open",
      pagador: "Unabot Jose",
      debito: { valor: "1574", codigo: "USD", escala: 2 },
      recibe: { valor: "5000000", codigo: "COP", escala: 2 },
    });
    const eventos = (await m.servicio.obtener(cobro.numero))?.eventos.map(
      (e) => e.tipo,
    );
    expect(eventos).toContain("cotizado");
  });

  it("rechaza wallets de hosts no permitidos antes de salir a la red", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "");
    expect(
      await codigoDe(
        m.servicio.cotizar(cobro.token, "https://otro.example.com/x"),
      ),
    ).toBe("wallet_no_permitida");
    expect(
      await codigoDe(m.servicio.cotizar(cobro.token, "https://127.0.0.1/x")),
    ).toBe("wallet_invalida");
  });

  it("rechaza una cotización que no coincide con el cobro", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "");
    m.control.recibeFalso = { valor: "1", codigo: "COP", escala: 2 };
    expect(await codigoDe(m.servicio.cotizar(cobro.token, PAGADOR))).toBe(
      "open_payments_fallo",
    );
  });

  it("no cotiza un cobro vencido ni uno que no existe", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "");
    expect(await codigoDe(m.servicio.cotizar("a".repeat(22), PAGADOR))).toBe(
      "cobro_no_disponible",
    );
    m.avanzar(VENCE_EN_MS + 1_000);
    expect(await codigoDe(m.servicio.cotizar(cobro.token, PAGADOR))).toBe(
      "cobro_no_disponible",
    );
  });
});

describe("servicio Open Payments: aprobar y regresar de la wallet", () => {
  it("manda al pagador a su wallet y recuerda cómo continuar", async () => {
    const m = montarReal();
    const { aprobacion, cobro } = await llegarAlConsentimiento(m);
    expect(aprobacion).toEqual({
      redirect: "https://auth.interledger-test.dev/interact/abc",
    });
    const eventos = (await m.servicio.obtener(cobro.numero))?.eventos.map(
      (e) => e.tipo,
    );
    expect(eventos).toEqual(["creado", "cotizado", "consentimiento_iniciado"]);
  });

  it("no deja aprobar con el intento de otro cobro ni con un precio vencido", async () => {
    const m = montarReal();
    const a = await m.servicio.crearCobro(50_000, "");
    const b = await m.servicio.crearCobro(20_000, "");
    const cotA = await m.servicio.cotizar(a.token, PAGADOR);
    expect(await codigoDe(m.servicio.aprobar(b.token, cotA.intentoId))).toBe(
      "intento_no_encontrado",
    );
    expect(
      await codigoDe(
        m.servicio.aprobar(a.token, "00000000-0000-4000-8000-000000000000"),
      ),
    ).toBe("intento_no_encontrado");
    m.avanzar(6 * 60_000);
    expect(await codigoDe(m.servicio.aprobar(a.token, cotA.intentoId))).toBe(
      "cotizacion_vencida",
    );
  });

  it("al regresar con el hash correcto crea el pago y queda procesando", async () => {
    const m = montarReal();
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);

    // El nonce del cliente se generó al aprobar: lo recuperamos del intento guardado.
    const nonce = await nonceDelIntento(m, cotizacion.intentoId);
    const resultado = await m.servicio.completarRetorno(cotizacion.intentoId, {
      interactRef: "REF-1",
      hash: hashDe(nonce, "REF-1"),
    });

    expect(resultado).toEqual({ token: cobro.token });
    expect(m.control.completados).toEqual(["REF-1"]);
    const actual = await m.repo.obtener(cobro.numero);
    expect(actual?.estado).toBe("procesando");
    expect(actual?.outgoingPaymentUrl).toMatch(/outgoing\/1$/);
  });

  it("con un hash falso no se envía dinero y queda constancia", async () => {
    const m = montarReal();
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);
    const resultado = await m.servicio.completarRetorno(cotizacion.intentoId, {
      interactRef: "REF-1",
      hash: "hash-falso",
    });
    expect(resultado).toEqual({
      token: cobro.token,
      error: "retorno_invalido",
    });
    expect(m.control.completados).toEqual([]);
    const eventos = (await m.repo.obtener(cobro.numero))?.eventos.map(
      (e) => e.tipo,
    );
    expect(eventos).toContain("pago_fallido");
    expect((await m.repo.obtener(cobro.numero))?.estado).toBe("esperando");
  });

  it("si el pagador rechaza en su wallet (sin interact_ref) lo registra", async () => {
    const m = montarReal();
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);
    expect(await m.servicio.completarRetorno(cotizacion.intentoId, {})).toEqual(
      {
        token: cobro.token,
        error: "consentimiento_rechazado",
      },
    );
    expect(m.control.completados).toEqual([]);
  });

  it("no envía el pago si el cobro venció mientras el pagador aprobaba", async () => {
    const m = montarReal();
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);
    const nonce = await nonceDelIntento(m, cotizacion.intentoId);
    m.avanzar(VENCE_EN_MS + 1_000);
    const resultado = await m.servicio.completarRetorno(cotizacion.intentoId, {
      interactRef: "REF-1",
      hash: hashDe(nonce, "REF-1"),
    });
    expect(resultado).toEqual({
      token: cobro.token,
      error: "cobro_no_disponible",
    });
    expect(m.control.completados).toEqual([]);
  });

  it("un fallo de la wallet al crear el pago deja el cobro esperando y con constancia", async () => {
    const m = montarReal();
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);
    const nonce = await nonceDelIntento(m, cotizacion.intentoId);
    m.control.falloAlCompletar = true;
    const resultado = await m.servicio.completarRetorno(cotizacion.intentoId, {
      interactRef: "REF-1",
      hash: hashDe(nonce, "REF-1"),
    });
    expect(resultado.error).toBe("open_payments_fallo");
    expect((await m.repo.obtener(cobro.numero))?.estado).toBe("esperando");
  });

  it("un intento que no existe no revela nada", async () => {
    const m = montarReal();
    expect(
      await m.servicio.completarRetorno(
        "00000000-0000-4000-8000-000000000000",
        {
          interactRef: "x",
          hash: "y",
        },
      ),
    ).toEqual({ error: "intento_no_encontrado" });
  });
});

describe("servicio Open Payments: confirmar el dinero", () => {
  async function pagoEnviado(m: ReturnType<typeof montarReal>) {
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);
    const nonce = await nonceDelIntento(m, cotizacion.intentoId);
    await m.servicio.completarRetorno(cotizacion.intentoId, {
      interactRef: "REF-1",
      hash: hashDe(nonce, "REF-1"),
    });
    return cobro;
  }

  it("pasa a cobrado cuando el dinero llega, con su evento", async () => {
    const m = montarReal();
    const cobro = await pagoEnviado(m);
    expect((await m.servicio.obtener(cobro.numero))?.estado).toBe("procesando");

    m.control.llegoElDinero = true;
    m.avanzar(2_000);
    const final = await m.servicio.obtener(cobro.numero);
    expect(final?.estado).toBe("cobrado");
    expect(final?.eventos.map((e) => e.tipo)).toEqual([
      "creado",
      "cotizado",
      "consentimiento_iniciado",
      "pago_enviado",
      "cobrado",
    ]);
  });

  it("si el dinero no llega en 3 minutos lo da por fallido", async () => {
    const m = montarReal();
    const cobro = await pagoEnviado(m);
    m.avanzar(PAGO_SIN_CONFIRMAR_MS + 2_000);
    const final = await m.servicio.obtener(cobro.numero);
    expect(final?.estado).toBe("fallido");
    expect(final?.eventos.at(-1)?.tipo).toBe("pago_fallido");
  });

  it("si la wallet marca el pago como fallido, lo muestra enseguida y no espera 3 minutos", async () => {
    const m = montarReal();
    const cobro = await pagoEnviado(m);
    expect(m.control.consultasSalientes).toEqual([]);

    m.control.pagoSalienteFallido = true;
    m.avanzar(2_000);
    const final = await m.servicio.obtener(cobro.numero);
    expect(final?.estado).toBe("fallido");
    expect(final?.eventos.at(-1)).toMatchObject({
      tipo: "pago_fallido",
      detalle: "la wallet del pagador no completó el pago",
    });
    expect(m.control.consultasSalientes).toEqual(["TOKEN-DEL-PAGO"]);
    // Cerrado el cobro, el token del pago se borra.
    expect(await m.repo.tokenDePago(cobro.numero)).toBeUndefined();
  });

  it("si el dinero ya llegó no lo da por fallido aunque la wallet diga que falló", async () => {
    const m = montarReal();
    const cobro = await pagoEnviado(m);
    m.control.pagoSalienteFallido = true;
    m.control.llegoElDinero = true;
    m.avanzar(2_000);
    expect((await m.servicio.obtener(cobro.numero))?.estado).toBe("cobrado");
    expect(await m.repo.tokenDePago(cobro.numero)).toBeUndefined();
  });

  it("el token del pago nunca sale en el cobro ni en la vista pública", async () => {
    const m = montarReal();
    const cobro = await pagoEnviado(m);
    const visto = JSON.stringify([
      await m.servicio.obtener(cobro.numero),
      await m.servicio.verComoPagador(cobro.token),
    ]);
    expect(visto).not.toContain("TOKEN-DEL-PAGO");
  });

  it("no consulta la wallet más de una vez por segundo aunque varios sondeen", async () => {
    const m = montarReal();
    await pagoEnviado(m);
    const antes = m.control.consultas;
    await Promise.all([
      m.servicio.listar(),
      m.servicio.listar(),
      m.servicio.listar(),
    ]);
    expect(m.control.consultas - antes).toBeLessThanOrEqual(1);
  });
});

describe("link, QR y código: nadie adivina un cobro ajeno", () => {
  it("cada cobro tiene un token distinto, de 128 bits, y no es el código", async () => {
    const m = montarReal();
    const a = await m.servicio.crearCobro(50_000, "");
    const b = await m.servicio.crearCobro(50_000, "");
    expect(a.token).toMatch(TOKEN_RE);
    expect(b.token).toMatch(TOKEN_RE);
    expect(a.token).not.toBe(b.token);
    expect(a.token).not.toContain(a.codigo);
  });

  it("el código de 6 dígitos no abre, cotiza ni aprueba un cobro", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "");
    expect(await m.servicio.verComoPagador(cobro.codigo)).toBeUndefined();
    expect(await codigoDe(m.servicio.cotizar(cobro.codigo, PAGADOR))).toBe(
      "cobro_no_disponible",
    );
  });

  it("el código solo sirve para encontrar el token", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "");
    expect(await m.servicio.resolverCodigo(cobro.codigo)).toBe(cobro.token);
    expect(await m.servicio.resolverCodigo("000000")).toBeUndefined();
  });

  it("un token que no existe no da ninguna pista", async () => {
    const m = montarReal();
    expect(await m.servicio.verComoPagador("a".repeat(22))).toBeUndefined();
  });

  it("un cobro ya pagado no se puede volver a pagar con su link", async () => {
    const m = montarReal();
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);
    const nonce = await nonceDelIntento(m, cotizacion.intentoId);
    await m.servicio.completarRetorno(cotizacion.intentoId, {
      interactRef: "REF-1",
      hash: hashDe(nonce, "REF-1"),
    });
    m.control.llegoElDinero = true;
    m.avanzar(2_000);
    await m.servicio.obtener(cobro.numero);

    expect(await codigoDe(m.servicio.cotizar(cobro.token, PAGADOR))).toBe(
      "cobro_no_disponible",
    );
    expect(
      await codigoDe(m.servicio.aprobar(cobro.token, cotizacion.intentoId)),
    ).toBe("cobro_no_disponible");
  });
});

describe("confirmación: el mismo código en las dos pantallas", () => {
  async function cobrar(m: ReturnType<typeof montarReal>) {
    const { cobro, cotizacion } = await llegarAlConsentimiento(m);
    const nonce = await nonceDelIntento(m, cotizacion.intentoId);
    await m.servicio.completarRetorno(cotizacion.intentoId, {
      interactRef: "REF-1",
      hash: hashDe(nonce, "REF-1"),
    });
    return cobro;
  }

  it("no existe hasta que el dinero llega", async () => {
    const m = montarReal();
    const cobro = await cobrar(m);
    expect(
      (await m.servicio.obtener(cobro.numero))?.confirmacion,
    ).toBeUndefined();
    expect(
      (await m.servicio.verComoPagador(cobro.token))?.confirmacion,
    ).toBeUndefined();
  });

  it("vendedor y pagador reciben el mismo código de 4 dígitos al llegar el dinero", async () => {
    const m = montarReal();
    const cobro = await cobrar(m);
    m.control.llegoElDinero = true;
    m.avanzar(2_000);

    const vendedor = await m.servicio.obtener(cobro.numero);
    const pagador = await m.servicio.verComoPagador(cobro.token);
    expect(vendedor?.estado).toBe("cobrado");
    expect(vendedor?.confirmacion).toMatch(/^\d{4}$/);
    expect(pagador?.confirmacion).toBe(vendedor?.confirmacion);
    expect(pagador?.pagadoEn).toBe(vendedor?.pagadoEn);
  });

  it("el pagador nunca recibe datos internos del cobro", async () => {
    const m = montarReal();
    const cobro = await cobrar(m);
    m.control.llegoElDinero = true;
    m.avanzar(2_000);
    const pagador = await m.servicio.verComoPagador(cobro.token);
    expect(JSON.stringify(pagador)).not.toContain(cobro.id);
    expect(JSON.stringify(pagador)).not.toContain(cobro.codigo);
    expect(JSON.stringify(pagador)).not.toContain("incoming");
  });
});

describe("servicio demo", () => {
  function montarDemo() {
    let t = T0;
    const ahora = () => t;
    const repo = crearRepoMemoria(ahora);
    const servicio = crearServicioDemo({
      repo,
      intentos: crearRepoIntentosMemoria(),
      ahora,
    });
    return { servicio, avanzar: (ms: number) => (t += ms) };
  }

  it("cotiza con la tasa de ejemplo, aprueba y se confirma solo a los 5 s", async () => {
    const { servicio, avanzar } = montarDemo();
    const cobro = await servicio.crearCobro(50_000, "Ropa");
    const cot = await servicio.cotizar(cobro.token, PAGADOR);
    expect(cot.debito).toEqual({ valor: "1574", codigo: "USD", escala: 2 });
    expect(cot.receptor).toBe(cobro.comercio);

    expect(await servicio.aprobar(cobro.token, cot.intentoId)).toEqual({
      estado: "procesando",
    });
    avanzar(5_000);
    expect((await servicio.obtener(cobro.numero))?.estado).toBe("cobrado");
  });

  it("también valida la wallet y el intento", async () => {
    const { servicio } = montarDemo();
    const cobro = await servicio.crearCobro(50_000, "");
    expect(await codigoDe(servicio.cotizar(cobro.token, "$ilp.dev/x"))).toBe(
      "wallet_invalida",
    );
    expect(await codigoDe(servicio.cotizar("a".repeat(22), PAGADOR))).toBe(
      "cobro_no_disponible",
    );
    expect(
      await codigoDe(
        servicio.aprobar(cobro.token, "00000000-0000-4000-8000-000000000000"),
      ),
    ).toBe("intento_no_encontrado");
  });

  it("el retorno de Open Payments no existe en demo", async () => {
    const { servicio } = montarDemo();
    expect(await servicio.completarRetorno("x", {})).toEqual({
      error: "retorno_invalido",
    });
  });
});

/** El nonce del cliente lo genera el servicio al aprobar y queda guardado en el intento. */
async function nonceDelIntento(
  m: ReturnType<typeof montarReal>,
  intentoId: string,
): Promise<string> {
  const intento = await m.intentos.obtener(intentoId);
  if (!intento?.continuacion)
    throw new Error("el intento no tiene continuación guardada");
  return intento.continuacion.nonceCliente;
}

describe("servicio Open Payments: transparencia del precio", () => {
  it("la cotización trae la tasa de mercado cuando hay conversión", async () => {
    const m = montarReal(async () => 3_200);
    const cobro = await m.servicio.crearCobro(50_000, "");
    const cotizacion = await m.servicio.cotizar(cobro.token, PAGADOR);
    expect(cotizacion.tasaReferencia).toBe(3_200);
  });

  it("sin fuente de tasas la cotización sigue funcionando, sin referencia", async () => {
    const m = montarReal();
    const cobro = await m.servicio.crearCobro(50_000, "");
    const cotizacion = await m.servicio.cotizar(cobro.token, PAGADOR);
    expect(cotizacion.tasaReferencia).toBeNull();
  });
});

describe("servicio Open Payments: lo que ve la wallet del vendedor", () => {
  it("el incoming payment lleva el comercio y el concepto como descripción", async () => {
    const m = montarReal();
    await m.servicio.crearCobro(50_000, "Ropa");
    await m.servicio.crearCobro(20_000, "");
    expect(m.control.descripciones).toEqual([
      `${COMERCIO_EJEMPLO} · Ropa`,
      COMERCIO_EJEMPLO,
    ]);
  });
});
