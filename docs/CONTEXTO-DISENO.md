# Trivo: contexto completo para rediseñar la experiencia (web y móvil)

Documento autocontenido. Quien lo lea debería entender el problema, el usuario, la lógica del producto, lo que ya existe, lo que es simulado y qué se espera de un mejor diseño. No contiene credenciales. Fecha de corte: viernes 16 de octubre de 2026, tarde.

---

## 1. Qué es Trivo, en una frase

Trivo es una app para vendedores informales de locales del centro de las ciudades colombianas (empezando por Medellín). El vendedor teclea un monto, cobra con un código, un QR o un link, y **cada cobro queda registrado como historial de ventas**. Ese historial es su "hoja de vida financiera": le sirve para acceder a crédito pequeño sin papeleo, en lugar del "gota a gota". El pagador (un cliente local o un turista) ve cuánto paga, incluso convertido a su moneda, y aprueba **en su propia wallet**.

Nombre del producto: **Trivo**. Idioma: español de Colombia para el vendedor; español e inglés para el pagador.

## 2. Por qué existe (el problema)

- Un vendedor informal no puede pedir crédito formal porque no puede demostrar lo que vende. Cobra en efectivo y no deja rastro.
- Cuando el sistema formal lo rechaza, acude al crédito informal carísimo. Datos del reporte _El futuro de la innovación financiera_ (FIND, EAFIT, agosto de 2026):
  - Cerca de 1 de cada 3 adultos con crédito lo obtiene fuera del sector regulado.
  - El "gota a gota" cobra en promedio **382,2% efectivo anual** a hogares y **666,5%** a MiPymes. Para comparar: banco corriente cerca de 16%, usura de consumo 24 a 29%, microcrédito cerca de 55%.
  - El acceso a cuenta ya ronda el 96% de los adultos. El problema no es tener cuenta sino el racionamiento del crédito formal.
  - Combinar datos transaccionales con el historial tradicional añade hasta 10% de poder predictivo a un modelo de scoring (VantageScore, 2024, citado por FIND). Esa es la base de la idea: el historial de cobros es un dato alternativo valioso.
  - Remesas: Colombia recibió USD 13.098 millones en 2025 (cerca de 3% del PIB); enviar cuesta cerca de 5% frente a una meta de 3%. Sirve para el argumento de pagos entre monedas sin intermediarios.
  - Bre-B (pagos inmediatos del Banco de la República) ya tiene 34,9 millones de usuarios: Colombia construyó los rieles, falta darles uso.
- Además, el vendedor informal desconfía de la DIAN y de la formalización. La formalización hoy solo le quita; Trivo busca que **le dé algo a cambio**.
- Un vendedor puede temer que registrar ventas afecte sus subsidios. Existe el **RUI (Registro Universal de Ingresos)** del DNP, que reemplaza al Sisbén (implementación desde el 1 de agosto de 2026, transición hasta el 31 de octubre de 2026). Trivo no promete cómo afectará al RUI; debe ser transparente sobre qué datos se guardan y para qué.

## 3. Contexto del hackatón

- Open Payments Hackathon de Interledger Foundation, en Ruta N (Medellín), 16 y 17 de octubre de 2026.
- **Cierre estricto de código: sábado 17, 11:00 a.m.**, push a `main` en repo público. A las **12:00 p.m.** cierran el video de demo y las diapositivas.
- Video de demo: el flujo de pago completo mostrando autorización (consentimiento), solicitud, ejecución y finalización exitosa.
- Criterios: definición del problema, uso de Open Payments, experiencia de usuario, calidad técnica, presentación, innovación, inclusión e impacto. Premios: Puntored (inclusión financiera), FIND (innovación), Ruta N (impacto), This Week in Fintech (comunidad).
- Obligatorio: integrar la API de Open Payments; `AI_USAGE.md` y carpeta `/prompts` con los prompts reales.
- Equipo de 5 personas, todas nuevas en Interledger. Reparto inicial: líder técnico, backend, frontend, producto, documentación y pitch.

## 4. Usuarios y situación de uso

**Vendedor (usuario principal).** Dueño de un local pequeño del centro. De pie, una mano, a veces con luz fuerte de calle, entre un cliente y otro. Usa el celular. Poco tiempo, poca paciencia con trámites, desconfianza hacia lo tributario. Meta: cobrar en menos de 10 segundos sin aprender nada nuevo y ver crecer su historial.

**Pagador (secundario).** Cliente local o turista. **No tiene cuenta en Trivo**; solo paga desde su wallet. Puede pagar en otra moneda (por ejemplo USD). Necesita ver el precio exacto y sentirse seguro antes de aprobar.

Restricciones de uso que el diseño debe respetar:

- Mobile-first de verdad: operación con una mano, objetivos táctiles grandes (mínimo 44 px; hoy las teclas miden 56 a 64 px).
- Legible a pleno sol: contraste alto, texto grande.
- Miedo al phishing: por eso el **código de 6 dígitos y el QR** son tan importantes como el link. La aprobación del dinero nunca ocurre en una página de Trivo sino en la wallet del pagador.
- No todos saben usar un QR: por eso hay varios canales equivalentes.

## 5. Principios del producto

1. **Un solo campo para cobrar: el monto.** Todo lo demás es opcional.
2. **Formalizar da algo a cambio**: cada cobro suma a un historial utilizable.
3. **El dinero se autoriza en la wallet del pagador**, nunca en una página nuestra.
4. **Transparencia antes de aprobar**: monto, conversión y tasa visibles.
5. **Lenguaje de tienda**, no de banco ni de DIAN.

## 6. Cómo funciona Open Payments y cómo se mapea al producto

Open Payments es un estándar abierto de APIs para mover dinero entre wallets (sobre Interledger). Autorización con GNAP. Flujo en 8 pasos:

1. Descubrir la wallet address (GET a la URL de la wallet).
2. Grant (permiso) para crear un _incoming payment_ en la wallet del receptor (no interactivo).
3. Crear el _incoming payment_: monto, vencimiento, metadatos.
4. Grant para una _quote_ en la wallet del emisor (no interactivo).
5. Crear la _quote_: monto a debitar, comisiones, monto a entregar.
6. **Grant interactivo de _outgoing payment_**: el usuario aprueba en el navegador (consentimiento). Es obligatoriamente interactivo.
7. Crear el _outgoing payment_: los fondos se mueven.
8. Monitorear y confirmar.

Mapeo en Trivo:

- El **cobro** del vendedor es un _incoming payment_ con monto fijo en COP y vencimiento.
- La **pantalla del pagador** muestra la _quote_: cuánto se le debita (por ejemplo USD) y la tasa.
- El botón **Aprobar** lanza el grant interactivo en la wallet del pagador.
- La **confirmación** (paso 8) es la que hoy se simula.

Validado de verdad en la testnet (wallet de pruebas `wallet.interledger-test.dev`): se ejecutó el flujo completo entre `test-open` (COP) y `unabot-jose-usd` (USD). Resultado: 10,00 USD se pagaron con 31.767,87 COP, es decir, tasa observada de **3.176,787 COP por USD**. Esa tasa es la que usa el demo como "tasa de ejemplo". El SDK oficial es `@interledger/open-payments` (Node/TypeScript).

Investigación sobre datáfono: los servicios de tarjeta y de punto de venta de Rafiki (el software de las wallets) son beta (desde diciembre de 2025) y los opera la entidad que tiene las cuentas, no una app como esta. El NFC exige elemento seguro y certificación; un navegador no puede emular una tarjeta. Conclusión: en el demo, "datáfono" es un **Modo caja** en el celular y se presenta el datáfono físico como siguiente paso (un cliente más de la misma API).

## 7. El flujo principal, paso a paso

### Vendedor

1. Abre la app. Ve el **talonario**: arriba un recibo en edición con el monto en cero, debajo el teclado, luego el botón **Cobrar**, y más abajo el **Talonario de hoy** con sus cobros y estados.
2. Teclea el monto (teclas 1 a 9, 00, 0, borrar; máximo 9 dígitos). Opcionalmente elige un concepto rápido: Ropa, Comida, Servicio, Otro.
3. Pulsa **Cobrar**. El servidor crea el cobro (número consecutivo, código de 6 dígitos, vencimiento a 10 minutos).
4. Ve el **recibo con el código grande**, un **QR** y el estado en vivo ("Esperando", "Vence en 09:52").
5. Comparte por el canal que prefiera: decir el código en voz alta, mostrar el QR, **Enviar por WhatsApp** (abre WhatsApp con un mensaje listo con el código y el link) o **Copiar link de pago**.
6. Ve cambiar el estado solo: _Esperando_ → _Procesando_ (el pagador aprobó) → _Cobrado_, o _Vencido_ si pasan 10 minutos.
7. Si el cobro queda **Cobrado**, aparece un sello de tinta azul "COBRADO" y el botón **Nuevo cobro**. En el demo existe el botón **Simular que ya pagó (demo)**: carga cerca de 5 segundos con barra de progreso y **vuelve solo al talonario**.
8. Debajo del recibo hay un desplegable **Historial de este cobro** con la trazabilidad: qué pasó y a qué hora.

### Pagador

1. Llega por **QR** (abre directo la pantalla de pago), por **link**, o entra a `/pagar` y **escribe el código de 6 dígitos**.
2. Ve en una sola pantalla: quién cobra, el monto en COP, **cuánto paga él** (por ejemplo USD 15,74), la **tasa** (1 USD = 3.177 COP), la comisión, y el tiempo que queda para pagar.
3. Escribe su **wallet address** (empieza con `https://`). Queda recordada para la próxima vez.
4. Pulsa **Aprobar en mi wallet**. En producción aquí se abre el consentimiento en su wallet.
5. Ve "Procesando tu pago" con barra de progreso y luego el sello "Pago enviado". Puede pasar a ES o EN en cualquier momento.

Estados de error ya cubiertos: código no encontrado, cobro vencido, cobro ya pagado, wallet inválida, error de red al aprobar, doble aprobación bloqueada.

### Tiempos

- Vencimiento del cobro: **10 minutos**.
- Simulación de pago ("procesando" a "cobrado"): **5 segundos** (en producción lo reemplaza la confirmación real de Open Payments).
- Actualización en vivo: la interfaz consulta al servidor cada **2 s** (cobro y pago) y cada **3 s** (talonario).

## 8. Mapa de pantallas (rutas actuales)

| Ruta              | Quién    | Contenido                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | Vendedor | Encabezado (Trivo, nombre del comercio). Recibo en edición con monto grande, perforación, talón con "Concepto (opcional)", N.º del próximo recibo y chips. Teclado numérico. Botón Cobrar. Talonario de hoy con total cobrado y filas-talón (número, monto, concepto y hora, chip de estado). Estado vacío: "Tu primer recibo aparece aquí cuando cobres." |
| `/cobro/[numero]` | Vendedor | Recibo con monto, N.º, concepto y hora; perforación; código grande; QR de 160 px; chip de estado y cuenta regresiva; botones WhatsApp, copiar link y simular pago (demo); barra de progreso en "procesando"; sello al cobrar; botón Nuevo cobro; desplegable de trazabilidad. Estado "No encontramos este recibo".                                         |
| `/pagar`          | Pagador  | Título "Pagar con código", campo de 6 dígitos con teclado numérico, botón Continuar, selector ES/EN.                                                                                                                                                                                                                                                       |
| `/p/[codigo]`     | Pagador  | Pantalla de revisión (ver sección 7). También: procesando, pago enviado, vencido, código no encontrado.                                                                                                                                                                                                                                                    |

Componentes: Keypad, EstadoChip, Sello (SVG de tinta), Qr, Trazabilidad, LangToggle, TopeProgress (extra, fuera del flujo), Icons.

## 9. Sistema de diseño actual (lo que hay hoy, para conservar o reemplazar)

**Concepto visual: "talonario de recibos".** Cada cobro es un recibo de papel. La metáfora debe reconocerse sin contenido por la **perforación punteada con muescas** y el **sello de tinta**.

- **Colores (fijados por el equipo):** primary `#007EA7` (acción, sello, estado cobrado), secondary `#1F1F1F` (tinta), tertiary `#80CED7` (solo "esperando/procesando"), neutral `#F0F0F0` (fondo de mesa y color de las muescas), papel blanco `#FFFFFF`. Estados añadidos: atención `#B45309` y crítico `#B42318` (hoy solo en topes y errores).
- **Tipografía (fijada):** Helvetica (en Windows y Android se verá Arial). Pesos 400 y 700. Números tabulares. Monto principal 60 px bold; título 30 px; cuerpo 16 px; etiquetas 14 px; chips 12 px.
- **Forma:** radio de 16 px en recibos, teclas, botones y campos; chips en píldora; perforación de 2 px punteada al 20% de la tinta con muescas semicirculares de 24 px; hojas apiladas bajo el recibo en edición; talones con perforación entre filas.
- **Profundidad:** una sombra suave de papel; sombra pequeña en botones.
- **Movimiento (una sola pieza firma, respeta "reducir movimiento"):** el talón se "rasga" al aparecer (0,55 s); el sello se estampa (0,4 s); latido en estados pendientes (1,4 s); barra de progreso de 5 s.
- **Accesibilidad:** contraste AA, estado nunca solo por color (siempre texto), foco visible, objetivos táctiles grandes, selección de texto con la paleta, `aria` en barras de progreso y teclado.
- **Reglas de diseño aplicadas (evitar):** etiqueta pequeña sobre un título (kicker), degradados en texto, vidrio decorativo, sombras duras desplazadas, bordes laterales de color en tarjetas, emojis como íconos, tarjetas idénticas anidadas.

Deudas de diseño conocidas: el blanco del papel no es un token; las muescas de la perforación y del talón usan desplazamientos distintos; faltan capturas revisadas de algunos estados (formulario de código, talonario vacío, pago en inglés, pantalla de cobro vencida); en un escritorio ancho la columna se queda en 448 px de ancho (no hay diseño de escritorio propio).

Resultado de la revisión de diseño automática: 6 de 8 correcciones resueltas, 2 parciales por razones de captura (no de código).

## 10. Qué espera el rediseño

Objetivo: una experiencia **más intuitiva, más agradable y más rápida**, que funcione bien en móvil y también tenga un diseño propio de web.

Debe conservar:

- La lógica de un campo para cobrar, los cuatro canales (código, QR, WhatsApp, link) y el estado en vivo.
- La transparencia de precio para el pagador y el mensaje de que el dinero se aprueba en su wallet.
- La paleta y Helvetica (o justificar el cambio con el equipo).
- Pocas pantallas: cobrar en menos de 10 segundos; pagar en dos toques.

Ideas abiertas (no decididas, para explorar):

- **Web de escritorio:** consola del vendedor con el teclado a un lado y el talonario del día al otro; vista de pagador centrada.
- **Móvil del vendedor:** acceso directo (PWA) y pantalla de cobro que siempre quede en el primer viewport.
- **Cuenta abierta (fiado digital):** un cliente frecuente aprueba una vez un tope y el vendedor cobra sin pedir aprobación cada vez; el progreso hacia el tope debe verse.
- **Racha de ventas** ("llevas 30 días registrando") y **resumen semanal** ("vendiste X, tu mejor día fue el sábado") como educación con sus propios datos.
- **Topes tributarios** visibles antes de llegar a ellos (ver sección 11).
- **Modo caja / datáfono** como pantalla dedicada y vista previa de mensajes de SMS y WhatsApp.
- Historial y "hoja de vida financiera" como pantalla propia que muestre el progreso hacia el crédito.

Entregables útiles: sistema de componentes responsive (móvil, tablet, escritorio), pantallas de todos los estados listados arriba, versión en español e inglés del pagador, y un modo de alto contraste para luz fuerte.

## 11. Extras ya construidos o investigados

**Topes tributarios (componente `TopeProgress`, aún no en el flujo principal).** Barras de progreso con avisos al 70%, 90% y 100%:

- UVT 2026 = **$52.374** (Resolución DIAN 238 de 2025).
- Obligación de facturar (persona natural no responsable de IVA, con las condiciones del art. 437 E.T.): 3.500 UVT = **$183.309.000**.
- Obligación de declarar renta por ingresos: 1.400 UVT = **$73.323.600** (para el año gravable 2025 se usa la UVT de 2025: $69.718.600).
- Patrimonio bruto para declarar: 4.500 UVT. El tope del Régimen Simple no se incluyó porque las fuentes se contradicen.
- Los valores son datos por año, no constantes. Son informativos, no asesoría tributaria: deben validarse con la DIAN o un contador.

**Factura electrónica y puntaje de crédito:** simulados. Una factura DIAN real requiere un proveedor tecnológico habilitado; un préstamo real requiere un prestamista aliado.

**RUT vs RUI:** RUT es el registro de la DIAN (necesario para facturar). RUI es el registro de ingresos del DNP que reemplaza al Sisbén.

## 12. Arquitectura técnica (resumen para diseñadores y desarrolladores)

- **Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript estricto, Tailwind v4, zod, Vitest, ESLint, Prettier. Base de datos: Supabase (Postgres) accedida con **Prisma ORM 7** (la aplicación no contiene SQL; las reglas de integridad viven en las migraciones).
- **Despliegue:** servidor propio con Docker (sin Node instalado en el host); el frontend corre en el puerto **9028**. `next build` usa salida `standalone`.
- **Carpetas:** `src/app` (páginas y API), `src/components`, `src/lib` (dominio puro con tests), `src/server` (repositorio, límite de intentos, utilidades HTTP), `prisma` (esquema y migraciones), `src/generated` (cliente, se genera), `docs`, `prompts`.

**Endpoints (API):**

| Método y ruta                            | Qué hace                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `POST /api/cobros`                       | Crea un cobro (monto, concepto). Devuelve 201.                                                    |
| `GET /api/cobros`                        | Talonario de hoy con estados en vivo.                                                             |
| `GET /api/cobros/[numero]`               | Detalle del cobro y su trazabilidad.                                                              |
| `POST /api/cobros/[numero]/eventos`      | Registra "enviado por WhatsApp" o "link copiado".                                                 |
| `POST /api/cobros/[numero]/simular-pago` | Demo: procesando y luego cobrado a los 5 s.                                                       |
| `GET /api/pago/[codigo]`                 | Vista pública del pagador; registra la primera apertura. Límite de 120 por minuto por IP.         |
| `POST /api/pago/[codigo]/aprobar`        | El pagador aprueba con su wallet. Devuelve 409 si ya no está disponible. Límite de 10 por minuto. |

**Modelo del cobro:** número consecutivo por comercio, código de 6 dígitos, comercio, monto en pesos enteros, concepto (máx. 30), estado (`esperando`, `procesando`, `cobrado`, `vencido`), creado, vence, pagado y lista de eventos.

**Trazabilidad:** cada cambio deja un evento con hora: `creado`, `compartido_whatsapp`, `link_copiado`, `abierto_por_pagador`, `aprobacion_iniciada`, `cobrado`, `vencido`. El esquema SQL propuesto hace la tabla de eventos de solo agregar (un trigger impide actualizar o borrar).

**Esquema (aprobado, aún no aplicado):** `prisma/schema.prisma` y la migración `prisma/migrations/20261016000000_init` con tablas `comercios`, `cobros` y `eventos`, restricciones de monto y estado, índice de código único mientras esté en uso, numeración atómica por comercio (contador incrementado dentro de la transacción), seguridad por filas activa sin políticas (solo el servidor accede) y columnas listas para Open Payments (incoming payment, quote, outgoing payment).

**Seguridad aplicada:** validación con zod en cada entrada; el pagador solo ve comercio, monto, concepto, estado y vencimiento; límite de intentos para frenar la adivinanza de códigos; la llave privada de Open Payments solo vivirá en el servidor y está fuera de git; `.env` ignorado por git.

**Seguridad pendiente:** los endpoints del vendedor **no tienen autenticación** todavía (hay que agregarla antes de exponer el servidor); el límite de intentos es en memoria y por proceso; la conexión directa de Supabase puede requerir IPv6 (si el servidor no lo tiene, usar el pooler).

## 13. Estado actual

**Hecho y verificado (tests, lint, tipos, formato y build pasan):** flujo de pantallas del vendedor y del pagador, QR, vencimiento y estado en vivo, trazabilidad, API con repositorio en memoria, ES/EN en el pagador, topes tributarios (componente), `PRODUCT.md` y `DESIGN.md`, esquema SQL redactado.

**Simulado:** confirmación del pago, factura electrónica, puntaje y crédito, tasa de cambio (usa una tasa de ejemplo), datos semilla del talonario (tres cobros de ejemplo).

**Listo para activar:** el repositorio de Postgres usa **Prisma ORM** (sin SQL en la aplicación): el número consecutivo sale de un contador incrementado en la transacción, cada cambio de estado es una comparación y asignación atómica (`updateMany` con el estado esperado, sin bloqueos manuales), y el vencimiento y la confirmación de demo se calculan al leer, sin temporizadores. Comparte contrato con la versión en memoria y se elige con `COBROS_STORE` (`memoria` por defecto, `postgres` para Supabase). **Todavía no se ha ejecutado contra una base real**: sus 8 pruebas de integración corren en el CI con un Postgres desechable. Para activarlo: `npm run db:migrate` con el `DATABASE_URL` directo de Supabase y luego `COBROS_STORE=postgres`.

**Pendiente, en orden:**

1. Conectar Supabase y aplicar la migración.
2. Autenticación del vendedor.
3. Integrar Open Payments real: crear el incoming payment, la quote real, y el grant interactivo de outgoing payment con retorno al sitio; reemplazar el pago simulado.
4. Despliegue con Docker en el puerto 9028.
5. Rediseño web y móvil (este documento).
6. Cuenta abierta (fiado) con límites de grant, racha, resumen semanal.
7. Historial como "hoja de vida" y pantalla de topes dentro del flujo.
8. Video de demo y diapositivas (reto, usuario, solución, cómo se usó Open Payments, aprendizajes).

**Git:** rama `feat/flujo-cobro`. Commits: `first commit`, `chore: scaffold ...` y `feat: main cobro flow ...`. Los cambios de API, QR, trazabilidad y Postgres siguen sin commit. Reglas del equipo: nada de commit ni push sin permiso explícito, trabajo por ramas, nada de secretos en el repo.

## 14. Glosario

- **Wallet address / payment pointer:** URL pública que identifica una cuenta en Open Payments (por ejemplo `https://ilp.interledger-test.dev/nombre`).
- **Incoming payment, quote, outgoing payment:** los tres objetos del pago en Open Payments (cobro a recibir, cotización, pago a enviar).
- **Grant (GNAP):** permiso de acceso; el de outgoing payment es interactivo (el usuario aprueba).
- **ASE (entidad que administra cuentas):** el proveedor de wallet que opera Rafiki.
- **DIAN:** autoridad tributaria de Colombia. **RUT:** su registro único tributario. **UVT:** unidad de valor tributario.
- **RUI:** Registro Universal de Ingresos (DNP, reemplaza al Sisbén).
- **Bre-B:** sistema de pagos inmediatos del Banco de la República.
- **Gota a gota:** crédito informal diario de altísimo costo.
- **Natillera, cadena, tanda, susu, chama:** ahorro grupal informal (idea alternativa que quedó en pausa).
- **Fiado:** vender a crédito de palabra; en Trivo se imagina como "cuenta abierta" con tope.

## 15. Textos clave en pantalla (para mantener el tono)

Vendedor: "Cobrar", "Concepto (opcional)", "Talonario de hoy", "Cobrado: $155.000", "Dile este código a quien te paga", "O que escanee este QR con la cámara", "Esperando", "Vence en 09:52", "Confirmando el pago…", "Enviar por WhatsApp", "Copiar link de pago", "Nuevo cobro", "Historial de este cobro", "Tu primer recibo aparece aquí cuando cobres."

Pagador (ES / EN): "te cobra / is charging you", "Tú pagas / You pay", "Tasa / Rate", "Comisión / Fee", "Tu wallet address / Your wallet address", "Aprobar en mi wallet / Approve in my wallet", "El dinero solo se mueve cuando tú lo apruebas en tu wallet, no en esta página. / Money only moves when you approve it in your wallet, not on this page.", "Procesando tu pago / Processing your payment", "Pago enviado / Payment sent", "Este cobro venció / This charge has expired", "No encontramos ese código / We couldn't find that code".

**No inventar:** clientes, testimonios, cifras de ventas ni aliados. Todo lo que se muestre como ejemplo debe decir que es de ejemplo.
