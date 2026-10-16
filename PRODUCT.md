# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: vendedores informales de locales del centro de ciudades colombianas (empezando por Medellín). Cobran en efectivo, no tienen historial de ventas ni acceso a crédito formal, desconfían de la DIAN y de los trámites. Usan el celular, con poco tiempo entre cliente y cliente.

Secondary: quien paga. Clientes locales y turistas que pagan desde su propia wallet, a veces en otra moneda (por ejemplo USD). No necesitan cuenta en Trivo.

## Product Purpose

Trivo convierte cada cobro en historial. El vendedor teclea un monto, comparte una solicitud de pago y el pagador la aprueba. Cada venta cobrada queda registrada y arma un historial que le sirve para acceder a crédito pequeño sin papeleo, en lugar del "gota a gota". Éxito: un vendedor cobra en menos de 10 segundos sin aprender nada nuevo y ve crecer su historial.

## Positioning

Pagos directos entre wallets con Open Payments, sin la cadena de adquirente, emisor y gateway. El pagador ve antes de aprobar cuánto se le debita y a qué tasa, y el vendedor recibe un monto fijo en pesos.

## Operating Context

Hackatón Open Payments (Interledger Foundation), Ruta N, Medellín. Cierre de código: sábado 17 de octubre de 2026, 11:00 a.m. Demo en video del flujo completo: solicitud, autorización con consentimiento, ejecución y finalización. El prototipo corre en testnet (test wallet de Interledger).

## Capabilities and Constraints

- Flujo principal: el vendedor crea una solicitud (monto, concepto opcional). Se entrega al pagador por link, QR dinámico, código de 6 dígitos o "Modo caja". El pagador la abre, ve el precio convertido y aprueba el consentimiento en su wallet.
- El vendedor tiene cuenta. El pagador no. El pagador ve la pantalla en español o inglés.
- Stack: Next.js, TypeScript, Supabase (Postgres). Despliegue en servidor propio, frontend en el puerto 9028.
- Moneda del vendedor: COP. La conversión sale de la quote de Open Payments.
- Factura electrónica y puntaje de crédito son simulados en el demo. Una factura DIAN real exige un proveedor tecnológico habilitado.
- Fuera del núcleo (plus): topes tributarios, cuenta abierta (fiado), racha de ventas, resumen semanal, SMS y WhatsApp reales, datáfono físico.
- Sin decidir: directorio teléfono a wallet, nombre y logo definitivos.

## Brand Commitments

Nombre: Trivo. Paleta: primary `#007EA7`, secondary `#1F1F1F`, tertiary `#80CED7`, neutral `#F0F0F0`. Fuente: Helvetica. Voz: cercana, en español de Colombia, sin jerga financiera ni tributaria.

## Evidence on Hand

Reporte FIND 2026 (EAFIT): cerca de 1 de cada 3 adultos con crédito lo obtiene fuera del sector regulado; el "gota a gota" cobra en promedio 382,2% E.A. a hogares y 666,5% a MiPymes. No hay clientes, testimonios ni datos reales de ventas: no se deben inventar. Los montos en pantalla son de ejemplo.

## Product Principles

1. Un campo para cobrar: el monto. Todo lo demás es opcional.
2. Formalizar da algo a cambio, no solo quita: cada cobro suma a un historial que el vendedor puede usar.
3. El dinero se autoriza en la wallet del pagador, nunca en una página nuestra.
4. Transparencia antes de aprobar: monto, conversión y tasa visibles.
5. Lenguaje de tienda, no de banco ni de DIAN.

## Accessibility & Inclusion

Mobile-first, pensado para pantallas pequeñas, luz fuerte de calle y uso con una mano. Texto grande, contraste AA o mejor, y no depender solo del color para dar estado. Pagador en español o inglés.
