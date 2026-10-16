---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Surface brief: flujo principal de cobro

Scope: pantalla del vendedor (talonario), pantalla de cobro compartido, y flujo del pagador (/pagar, /p/[codigo]). Mode: Operate.

Audience and job: vendedor de local del centro, de pie, una mano, luz fuerte de calle; cobra en segundos entre clientes. Pagador (local o turista) abre un código o link, ve cuánto paga y aprueba en su wallet. Español para el vendedor; español o inglés para el pagador.

Action and task: teclear el monto, cobrar, compartir (código, WhatsApp, link, QR), ver el estado en vivo. El historial se ve desde el primer día.

Content and constraints: datos de ejemplo etiquetados como demo. Paleta fijada: primary #007EA7, secondary #1F1F1F, tertiary #80CED7, neutral #F0F0F0. Fuente Helvetica. Sin cuenta para el pagador.

Unresolved: QR real (depende de una librería, pendiente de permiso). Backend real (Open Payments + Supabase).

## Direction contract

THESIS: la pantalla del vendedor es un talonario de recibos. Cada cobro es un recibo numerado que se rasga y queda en el talonario con su estado. Rechaza la calculadora con lista de transacciones y el dashboard de métricas.

OWN-WORLD: recibo de papel blanco sobre fondo neutral #F0F0F0, tinta #1F1F1F, perforación punteada con muescas semicirculares entre cuerpo y talón, numeral tabular grande, sello azul #007EA7 rotado para COBRADO, tertiary #80CED7 para "esperando". Helvetica en pocos pesos. Reconocible sin contenido por la perforación y el sello.

STORY: el vendedor entiende que teclear un monto es crear un recibo; cree que su historial ya empezó; actúa pulsando Cobrar y compartiendo el código. El pagador ve monto, conversión y tasa antes de aprobar, y sabe que el dinero se mueve solo en su wallet.

FIRST VIEWPORT: columna única de 390 px. Arriba una barra mínima con el nombre del comercio. Debajo el recibo en edición: número de recibo en la esquina del talón, monto en 64 px bold, chips de concepto opcional. Luego el teclado 3x4 con teclas de 64 px y un botón Cobrar primario de 60 px a todo el ancho, siempre dentro del primer viewport. Un borde del talonario con el último recibo asoma debajo.

FORM: talonario (candidata 3 de 7 de mi lista, dealt por el seed 70695a4d). Momento firma: al cobrar, el recibo se rasga por la perforación con una animación de revelado corta con ease-out exponencial y aparece el talón con el código.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
