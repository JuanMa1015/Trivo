# Contexto de traspaso — Open Payments Hackathon (Ruta N, Medellín)

> Pega o adjunta este archivo al iniciar la conversación en Claude Desktop.
> Guárdalo también en el repo como `prompts/00-contexto-mentor.md` (cuenta para el registro obligatorio de prompts).

---

## 1. Instrucción para Claude

Actúa como mentor, arquitecto de software y evaluador crítico de nuestro equipo en el **Open Payments Hackathon** de Interledger Foundation, en Ruta N (Calle 67 Nº 52-20, Piso 2, Torre A, Medellín), los días **16 y 17 de octubre de 2026**.

Tu trabajo:

1. Ayudarnos a construir un prototipo funcional sobre la API de Open Payments.
2. Asegurar que el flujo técnico respete la arquitectura GNAP + Quotes + Incoming/Outgoing Payments.
3. Mantener al día la documentación obligatoria (`AI_USAGE.md` y `/prompts`).
4. Estructurar el pitch y los entregables para maximizar el puntaje.

Responde en español.

---

## 2. Reglas del hackatón (innegociables)

- **La integración con la API de Open Payments es obligatoria.** Sin ella, el proyecto no se evalúa.
- **Metodología:** identificar reto → idea → prototipo → probar el flujo de pago → presentar.
- **IA permitida**, con dos requisitos en la raíz del repo:
  - `AI_USAGE.md`: herramientas usadas, para qué, en qué archivos o funciones, y qué partes se escribieron a mano.
  - `/prompts`: el texto real de todos los prompts usados.

### Cronograma — sábado 17 de octubre

- **11:00 a.m.** Cierre estricto de código: push a `main` en un repo **público** de GitHub. No se permiten cambios después.
- **12:00 p.m.** Cierre de cargas: video de demo y diapositivas (por GitHub o Drive).
- **Video de demo:** el flujo de pago completo, mostrando autorización (consentimiento), solicitud, ejecución y finalización exitosa.
- **Diapositivas:** reto, usuario, solución, cómo se usó Open Payments y aprendizajes.
- **Criterios de evaluación:** definición del problema, uso de Open Payments, experiencia de usuario, calidad técnica, presentación, innovación, inclusión e impacto.
- **Premios:** Puntored (inclusión financiera), FIND (innovación), Ruta N (impacto) y This Week in Fintech (comunidad).

---

## 3. Flujo de la API en 8 pasos

1. **Descubrir la wallet address** (GET a la wallet).
2. **Grant de incoming payment** en la wallet del receptor (GNAP, no interactivo).
3. **Crear el incoming payment**: monto, vencimiento y metadatos.
4. **Grant de quote** en la wallet del emisor (no interactivo).
5. **Crear la quote**: monto a debitar, comisiones y monto a entregar.
6. **Grant interactivo de outgoing payment**: el usuario aprueba en el navegador. Es **obligatoriamente interactivo**.
7. **Crear el outgoing payment**: los fondos se mueven vía Interledger.
8. **Monitorear y confirmar** el estado.

Stack Interledger, de arriba hacia abajo:

- Aplicación: Open Payments, SPSP, Wallet Addresses.
- Transporte: STREAM.
- Protocolo: ILPv4.
- Enlace: BTP / ILP sobre HTTP.

---

## 4. Nuestro equipo y decisiones tomadas

- **5 personas**, todas nuevas en Interledger y Open Payments. Nos adaptamos a cualquier lenguaje.
- **Stack decidido: TypeScript (Node) + Next.js.** El SDK oficial (`@interledger/open-payments`) es Node/TS: firma las peticiones y valida las respuestas. En Python habría que firmar GNAP a mano.
  - **Backend:** Next.js API routes (o Express/Nest). La llave privada vive solo aquí.
  - **Frontend:** Next.js, mobile-first, porque el usuario informal usa celular.
- **Enfoque:** inclusión financiera, mercado informal colombiano y mundial.
- **Idea favorita (por confirmar a las 11:00 del viernes): ahorro grupal informal digital.**
  - Equivale a la natillera o cadena en Colombia, la tanda en México, el susu en África occidental, la chama en Kenia; en general, las ROSCAs.
  - Gancho técnico: un grant interactivo de outgoing payment **recurrente** con la propiedad `interval` (por ejemplo `R12/...` para 12 repeticiones) y un límite de monto. Cada miembro aprueba una vez y la app ejecuta las cuotas.
  - Otras ideas evaluadas: alternativa comunitaria al "gota a gota", y cobros QR para la tienda de barrio.

---

## 5. Primeros pasos (estado al viernes 9:40 a.m.)

1. **Todos:** crear cuenta en la test wallet, **https://wallet.interledger-test.dev** (el antiguo rafiki.money ya no se usa).
   - En el KYC solo el email debe ser real.
   - Crear una cuenta en **USD**, agregar un payment pointer (wallet address) y cargar dinero de prueba.
2. **Una persona (dueña de la app):** en Settings → Developer Keys, generar el par de llaves.
   - Se descarga `private.key`.
   - Copiar el `keyId`.
   - ⚠️ `private.key` va en `.gitignore`. **Nunca** se sube al repo público.
3. **Correr el ejemplo oficial:** https://github.com/interledger/open-payments-example
   - `npm install`
   - Configurar la llave, la wallet cliente y el keyId.
   - `node index.js`
   - Abrir la URL que imprime, aprobar el pago y volver a la terminal a dar Enter.
   - **Hito:** ver el saldo moverse entre dos wallets.
4. **Referencia:**
   - Snippets por recurso: https://github.com/interledger/open-payments-snippets
   - Documentación: https://openpayments.dev (secciones "Open Payments flow" y "Create an interactive grant").

### Reparto del equipo (hasta las 11:00 del viernes)

| Persona          | Tarea                                                              |
| ---------------- | ------------------------------------------------------------------ |
| 1. Líder técnico | Llaves + ejemplo oficial corriendo                                 |
| 2. Backend       | Leer el flujo y los snippets, crear el repo Next.js + TS           |
| 3. Frontend      | Bocetos de 3–4 pantallas móviles                                   |
| 4. Producto      | Datos de informalidad y un usuario real con nombre                 |
| 5. Docs + pitch  | Repo público, `AI_USAGE.md`, `/prompts`, esqueleto de diapositivas |

---

## 6. Próximos pasos pendientes con Claude

- Confirmar la idea final cuando el ejemplo oficial funcione.
- Diseñar la arquitectura concreta: endpoints, pantallas y modelo de datos.
- Hacer el plan por bloques horarios hasta el sábado a las 11:00 a.m.
- Crear las plantillas de `AI_USAGE.md` y `/prompts`.
- Armar la estructura del pitch y el guion del video de demo.
