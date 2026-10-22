# Open Payments

Trivo cobra con Open Payments sobre la testnet de Interledger. Hay dos rieles, que se eligen con `COBROS_RAIL`:

| Valor                | Qué hace                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `demo` (por defecto) | Cotiza con una tasa de ejemplo y el pago se confirma solo a los 5 s. Para ensayar la interfaz sin wallets.       |
| `open-payments`      | Pago real: incoming payment, cotización real, consentimiento en la wallet del pagador y confirmación del dinero. |

Con `open-payments` el botón "Simular que ya pagó" no existe (responde 404): un cobro solo pasa a `cobrado` cuando el dinero llega.

## Flujo

1. **Cobrar.** El vendedor crea el cobro. Trivo crea un _incoming payment_ en la wallet receptora (COP, monto fijo, vence a los 10 min).
2. **Ver precio.** El pagador abre el código, QR o link y escribe su wallet address. Trivo pide una _quote_ contra esa wallet y le muestra: a quién paga (el nombre que declara la wallet receptora), cuánto se le debita, la tasa y cuánto dura el precio.
3. **Aprobar.** Trivo pide un grant interactivo de _outgoing payment_, limitado al débito cotizado, y manda el navegador del pagador a su wallet.
4. **Consentimiento.** El pagador aprueba en su wallet, nunca en una página de Trivo. La wallet lo devuelve a `/api/pago/retorno` con `interact_ref` y `hash`.
5. **Retorno.** Trivo verifica el hash, continúa el grant y crea el _outgoing payment_. El cobro pasa a `procesando`.
6. **Confirmación.** Trivo consulta el incoming payment (público) hasta que `receivedAmount` alcanza el monto: entonces pasa a `cobrado`. Si en 3 minutos no llega, queda fallido, con su evento.

Cada paso deja un evento en la trazabilidad: `creado`, `cotizado`, `consentimiento_iniciado`, `pago_enviado`, `cobrado` o `pago_fallido`.

## Endpoints

| Método y ruta                              | Qué hace                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `GET /api/pago/[token]`                    | Lo que ve el pagador: receptor, monto, estado, vencimiento                     |
| `POST /api/pago/[token]/cotizar`           | Recibe `{ wallet }` y devuelve el precio exacto y un `intentoId`               |
| `POST /api/pago/[token]/aprobar`           | Recibe `{ intentoId }` y devuelve `{ redirect }` (o `{ estado }` en demo)      |
| `POST /api/pago/resolver                 ` | A donde la wallet devuelve al pagador; crea el pago y redirige a `/p/[codigo]` |

Errores: siempre `{ "error": "<codigo>" }` con un código estable (`wallet_invalida`, `cotizacion_vencida`, `cobro_no_disponible`, `open_payments_fallo`…), sin detalles internos.

### Lo que Trivo envía y lo que devuelve una wallet

- **Wallet address:** solo expone `publicName`, la moneda, y las URLs de sus servidores (comprobado en la testnet). No hay correo, nombre legal ni teléfono: el protocolo evita compartir datos personales. `publicName` lo escribe el titular, así que es una pista y no una prueba de identidad.
- **Incoming payment:** Trivo envía `metadata.description` con el comercio y el concepto (`Almacén El Centro · Ropa`). La testnet lo acepta y lo devuelve; si una wallet lo muestra depende de su proveedor.

### Comprobante de pago

`GET /api/cobros/[id]/comprobante?formato=a4|pos` (solo vendedor, solo cobros ya cobrados) descarga un PDF carta o un ticket POS de 80 mm. Es un recibo de Trivo con el código de confirmación; **no es una factura electrónica de venta**: esa la emite el comercio ante la DIAN con su proveedor.

### Cuentas por vendedor

Cada vendedor tiene su comercio: usuario único (sin distinguir mayúsculas), contraseña (hash scrypt con sal propia; nunca en claro) y **su propia wallet de cobro**. Todo lo del vendedor (cobros, talonario, resumen, impuestos, comprobantes y certificado) se filtra por el comercio de su sesión; las rutas y los repositorios reciben siempre el id del comercio, así que un cobro ajeno responde `404` aunque se conozca su id.

- **Invitado, sin PIN ni cuenta:** quien cobra por primera vez recibe una cookie de sesión firmada (`HttpOnly`, `SameSite=Lax`, `Secure` con https, 30 días) y un comercio sin cuenta. Puede hacer **5 cobros** con todo el flujo. Esos cobros salen a la wallet de la plataforma (`OPEN_PAYMENTS_RECEIVER_WALLET_URL`, o la wallet del cliente de Open Payments). Al sexto, `POST /api/cobros` responde `403 registro_requerido`.
- **Crear la cuenta** (`POST /api/registro`): usuario, comercio, contraseña y **wallet de cobro**. Si quien registra era invitado, la cuenta se queda con **el mismo comercio**: conserva sus cobros, su numeración y sus totales. Se valida la wallet (https, servidor permitido, existe y es COP) antes de guardarla.
- **Iniciar sesión** (`POST /api/acceso`): usuario y contraseña. Al salir (`DELETE /api/acceso`) se borra la cookie. Un invitado no ve "Salir" porque perdería sus cobros.
- **Cobrar a la wallet del vendedor:** Trivo pide a la wallet del vendedor un grant no interactivo de `incoming-payment` y crea el cobro ahí; el cobro guarda esa wallet (`wallet_receptora`) y la conciliación consulta esa misma wallet. Hoy solo se aceptan wallets en COP.
- **Límites de abuso:** registro abierto con tope por IP (5/hora) y global (100/hora); un comercio nuevo por cada visitante que cobra, con tope por IP (10/hora) y global (300/hora); inicio de sesión con tope por IP, global y por usuario, y comparación de contraseña con hash falso si el usuario no existe. Los topes viven en memoria del proceso (`ponytail`: con varias instancias van a la base). Sin proxy, la IP la puede inventar quien llame directo al puerto: el tope global es el que frena de verdad.
- **Migración:** `20261017180000_multi_vendedor` solo agrega columnas (`comercios.wallet_url`, `cobros.wallet_receptora`) y un índice único sobre `lower(usuario)`. El comercio y los cobros que ya había siguen siendo de su dueño: si tenía cuenta, entra con su usuario y contraseña; si no, queda como un invitado huérfano que nadie reclama.

### Certificado de ventas verificable

`GET /api/certificado?mes=YYYY-MM` (solo vendedor) descarga un PDF con lo cobrado ese mes, un código `ABCD-EFGH-IJKL-MNOP` y un QR. El código es un HMAC de comercio, titular, mes, total, cantidad y fecha de emisión con el secreto del servidor, así que `/verificar` (pública) comprueba que nadie cambió una cifra, sin sesión ni consultas. El enlace lleva esos datos en la URL: quien tenga el PDF ya los tiene. Solo acepta meses desde que el comercio empezó en Trivo (`creadoEn` del perfil) hasta el actual; los demás responden `400 datos_invalidos`. No es un certificado contable ni sustituye la declaración ante la DIAN. En producción real usa `CONFIRMACION_SECRETO`; en demo el secreto es aleatorio por proceso y los certificados dejan de verificar al reiniciar.

## Configuración

En `.env` (ver `.env.example`):

```
COBROS_RAIL=open-payments
OPEN_PAYMENTS_CLIENT_WALLET_URL=https://ilp.interledger-test.dev/<tu-wallet>
OPEN_PAYMENTS_KEY_ID=<keyId de Developer Keys>
OPEN_PAYMENTS_PRIVATE_KEY_PATH=./private.key
APP_BASE_URL=http://localhost:9028
```

- La llave privada (`private.key`) se descarga de la test wallet (Settings, Developer Keys). Está en `.gitignore` y **nunca** se sube. En el servidor vive en `/opt/trivo/open_payments.key` (modo `644` dentro de `/opt/trivo` con modo `700`) y `scripts/deploy.sh` la monta de solo lectura en `/run/secrets/open_payments.key`.
- La wallet receptora debe estar en **COP**. Por defecto es la misma de la app; se cambia con `OPEN_PAYMENTS_RECEIVER_WALLET_URL`.
- `APP_BASE_URL` debe ser una dirección a la que el navegador del pagador pueda volver desde su wallet (en local, `http://localhost:9028`).

## Probar en la testnet

1. Pon la llave en `./private.key` y las variables de arriba; arranca con `COBROS_RAIL=open-payments npm run dev -- -p 9028`.
2. Crea un cobro y abre su código en `/pagar` desde otra pestaña.
3. Wallet del pagador: otra wallet de la test wallet (por ejemplo la que está en USD). Pulsa "Ver precio" y "Aprobar en mi wallet".
4. Aprueba en la página de tu wallet. Al volver verás "Procesando" y luego "Pago enviado"; el vendedor ve el cobro como cobrado.

## Seguridad

- El pagador escribe una URL que nuestro servidor consulta con nuestra llave. Por eso solo se aceptan wallets `https://` de hosts permitidos (`OPEN_PAYMENTS_WALLET_HOSTS`, por defecto `ilp.interledger-test.dev`) y nunca IPs ni redes internas; lo mismo vale para los servidores que la wallet declara.
- La cotización se compara con el cobro: si la wallet cotiza otro monto, se rechaza.
- El permiso de pago alcanza solo para el débito cotizado.
- El hash del retorno se verifica antes de continuar el grant.
- No se envía dinero si el cobro ya no está esperando o el precio venció.
- Los endpoints tienen límite de intentos por IP.
- Los tokens de continuación se guardan en `intentos_pago`, tabla que solo el servidor puede leer (RLS activa sin políticas).

## Amenazas y defensas

Ningún sistema elimina las estafas por completo. Esto es lo que Trivo hace, y lo que no puede hacer.

| Amenaza                                                      | Defensa                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adivinar el link o el QR de otro cobro                       | El link y el QR llevan un **token de 128 bits** (22 caracteres), único por cobro. No se puede adivinar.                                                                                                                                                                                                         |
| Adivinar el código de 6 dígitos                              | El código **no abre ni paga nada**: solo ayuda a encontrar el token (`POST /api/pago/resolver`), con 8 intentos por minuto por IP.                                                                                                                                                                              |
| Reutilizar un link, QR o código                              | Cada cobro es único, vence a los 10 minutos y solo se puede pagar mientras esté `esperando`. El monto lo fija el incoming payment: no sirve para otro valor.                                                                                                                                                    |
| Página falsa que imita a Trivo y dibuja un "pago exitoso"    | El dinero se aprueba en la wallet del pagador, no en Trivo. Al llegar el dinero, el servidor genera un **código de confirmación de 4 dígitos** firmado con un secreto; aparece igual en la pantalla del vendedor y en la del pagador. Una página falsa no puede producirlo: si no coincide, el pago no es real. |
| Que el vendedor entregue algo sin que haya llegado el dinero | El vendedor solo ve "Cobrado" cuando Trivo comprobó que el incoming payment recibió el monto completo. No existe pago simulado con Open Payments real. La pantalla vibra y suena al llegar.                                                                                                                     |
| QR pegado como sticker encima del real                       | Trivo usa un **QR distinto por cobro, en la pantalla del vendedor**; no hay QR fijos impresos. Además el pagador ve, antes de aprobar, el nombre y la dirección de la wallet receptora y debe confirmar que son los correctos.                                                                                  |
| Página que nos incrusta o nos clona en un marco              | `Content-Security-Policy: frame-ancestors none`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (el token va en la URL), `nosniff`, `Permissions-Policy` y HSTS en producción.                                                                                                                         |
| Redirección a un sitio ajeno al pagar                        | El consentimiento solo se acepta en el mismo dominio que el servidor de autorización de la wallet del pagador.                                                                                                                                                                                                  |
| Usar nuestro servidor para atacar servidores internos (SSRF) | Solo wallets `https://` de hosts permitidos, nunca IPs ni redes internas.                                                                                                                                                                                                                                       |
| Wallet que cotiza otro monto                                 | La cotización debe coincidir exactamente con el cobro.                                                                                                                                                                                                                                                          |

### Lo que no podemos resolver

- **Un pagador en un sitio falso que no es Trivo** nunca llega a Trivo: la defensa es que el vendedor vea el código de confirmación solo cuando el dinero de verdad llegó a su wallet.
- **Ingeniería social** (alguien que presiona al pagador): el aviso "confirma el nombre" ayuda, pero no lo sustituye.
- **La wallet del pagador** es de su banco o proveedor; su descuento lo confirma ese proveedor. Trivo confirma lo que sí puede comprobar: que el dinero llegó al vendedor.

### Variables de seguridad

- Sesión del vendedor: cookie firmada con `CONFIRMACION_SECRETO` que lleva el id del comercio; cambiar el secreto cierra todas las sesiones. Ya no existe `VENDEDOR_PIN`. El pagador (`/p`, `/pagar`, `/api/pago`) no necesita sesión. Los enlaces del vendedor usan el `id` aleatorio del cobro; el N.º 0001 solo se muestra.
- `CONFIRMACION_SECRETO`: mínimo 32 caracteres. Obligatorio en producción con Open Payments real; en demo se usa uno aleatorio por proceso. Genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Límites conocidos

- El hash del retorno está comprobado contra la testnet: es SHA-256 en **base64 estándar** (con `=`) sobre `nonceCliente`, `nonceAs`, `interact_ref` y la URL completa del servidor de autorización, uno por línea.
- La confirmación consulta el incoming payment y el estado del pago saliente (`failed`); no usa webhooks. El protocolo no dice por qué falló un pago, así que Trivo no afirma que sea saldo insuficiente.
- El acceso del vendedor es una sola clave para todo el comercio. Con cuentas reales (Supabase Auth) se reemplaza `server/vendedor.ts` y las rutas siguen llamando a `exigirVendedor`.
- Los límites de intentos viven en memoria de un solo proceso y se apoyan en la IP que llega en `X-Forwarded-For`, que quien llame directo al puerto puede inventar. El acceso del vendedor tiene además un tope global; con varias instancias o un proxy confiable hay que moverlos a una base compartida.
