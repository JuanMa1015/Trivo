---
name: Trivo
description: Talonario de recibos para vendedores de local; cada cobro es un recibo de papel que se rasga y queda en el historial.
colors:
  primary: "#007ea7"
  secondary: "#1f1f1f"
  tertiary: "#80ced7"
  neutral: "#f0f0f0"
  paper: "#ffffff"
  atencion: "#b45309"
  critico: "#b42318"
typography:
  display:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
rounded:
  chip: "9999px"
  control: "16px"
  recibo: "16px"
  notch: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    height: "64px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    height: "56px"
  button-demo:
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    height: "48px"
  key:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    height: "64px"
  chip-concepto:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.chip}"
    height: "44px"
    padding: "0 12px"
  chip-concepto-selected:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.paper}"
  estado-cobrado:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.chip}"
    padding: "4px 12px"
  estado-esperando:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.chip}"
    padding: "4px 12px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    height: "56px"
  input-code:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.control}"
    height: "64px"
  recibo:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.recibo}"
    padding: "20px"
---

# Design System: Trivo

## Overview

**Creative North Star: "El Talonario"**

Trivo es un talonario de recibos de papel. Cada cobro es un recibo numerado: cuerpo arriba con el monto, una perforación punteada con muescas semicirculares, y un talón abajo con el código. Los recibos son hojas blancas sobre un fondo gris claro (#f0f0f0), con tinta casi negra y un único azul de sello. Reconocible sin contenido por la perforación y el sello.

La densidad es de una mano y luz de calle: una columna de 448 px máximo (`max-w-md`), numerales grandes en negrita, objetivos táctiles de 44 px o más, y un solo botón primario por pantalla. Todo es plano salvo el papel, que tiene una sombra suave de hoja sobre mesa. Las pantallas del pagador (/pagar, /p/[codigo]) usan el mismo recibo; el pagador ve en el papel monto, conversión y tasa antes de aprobar.

**Key Characteristics:**

- Papel blanco sobre neutral, perforación punteada con muescas como firma estructural.
- Un solo azul (primary) para acción, sello y estado cobrado; tertiary solo para "esperando".
- Helvetica en dos pesos efectivos (400 y 700); la jerarquía sale del tamaño.
- Numerales tabulares en todo el documento.
- Movimiento corto y con ease-out exponencial; se apaga con reduced motion.

## Colors

Paleta fija de cuatro colores de marca más blanco de papel y dos tintas de estado; fría, de tinta y papel, sin degradados.

### Primary

- **Azul de Sello** (#007ea7): botón primario, número de marca "Trivo", sello COBRADO, chip cobrado, código de cobro, anillo de foco, enlaces.

### Secondary

- **Tinta Casi Negra** (#1f1f1f): todo el texto, chip de concepto seleccionado, segmento de idioma activo. Textos de apoyo usan esta tinta al 70% de opacidad (`secondary/70`); bordes al 20-30%.

### Tertiary

- **Agua de Espera** (#80ced7): chip "Esperando" (con texto tinta), selección de texto, pulsación de tecla (al 40%).

### Neutral

- **Mesa Gris** (#f0f0f0): fondo del cuerpo, fondo de chips sin seleccionar, campo de código, pista de la barra de progreso, y las muescas de la perforación (deben igualar el fondo).
- **Papel** (#ffffff): recibos, teclas, botones secundarios, campo de wallet. Aparece como `#fff` literal en el CSS y como `white` de Tailwind, no como token.

### Estado (solo plus)

- **Atención Ámbar** (#b45309) y **Crítico Rojo** (#b42318): solo en tope-progress; oscurecidos para contraste AA sobre blanco.

### Named Rules

**The Single Ink Rule.** Un solo azul. Primary firma acción y confirmación; no se agregan otros acentos. Un recibo con el sello es lo más azul que verá una pantalla.
**The Notch Matches Table Rule.** Las muescas de la perforación se pintan con el color de fondo (`neutral`); si cambia el fondo, cambian las muescas.
**The Not-Color-Alone Rule.** Todo estado lleva texto (Cobrado, Esperando, Vencido), nunca solo color.

## Typography

**Display Font:** Helvetica (con Arial, sans-serif)
**Body Font:** Helvetica (con Arial, sans-serif)

**Character:** Una sola familia de sistema, fijada por la marca. Negrita para todo lo que se lee de un vistazo, regular para el texto de apoyo. Cifras tabulares (`font-variant-numeric: tabular-nums` en body) para que los montos alineen.

### Hierarchy

- **Display** (700, 3.75rem / 60 px, 1, -0.025em): monto en edición y monto del pagador; el código de cobro (6xl con tracking 0.06em) en azul. En la pantalla de cobro el monto baja a 3rem.
- **Headline** (700, 1.875rem, 1.2): títulos del pagador (Pagar, código no encontrado).
- **Title** (700, 1.25rem): etiqueta de botón primario, marca "Trivo", títulos de sección (1.125rem).
- **Body** (400, 1rem, 1.5): descripciones, con tinta al 70%.
- **Label** (700, 0.875rem): "Concepto (opcional)", número de recibo (N.º 0001), chips, filas de tasa. Los chips de estado van a 0.75rem. Sin mayúsculas salvo el selector ES/EN.

### Named Rules

**The Numeral Leads Rule.** El monto es siempre el elemento más grande de la pantalla.
**The Two Weights Rule.** Solo 400 y 700.

## Layout

Columna única, `max-w-md` centrada, `px-4`, `pt-4`, `pb-10`, con separación vertical de 20 px (gap-5) entre bloques; 24 px en /pagar. El teclado es una cuadrícula 3x4 con 8 px de separación y teclas de 64 px (56 px si la altura de pantalla es menor a 820 px); el botón Cobrar mide 64 px a todo el ancho. Dentro del recibo, relleno de 16-20 px. El historial (talones) va en un recibo propio bajo el botón. Sin breakpoints de ancho; el diseño no cambia en escritorio, solo se centra.

## Elevation & Depth

Plano sobre un solo plano de mesa, y el papel flota ligeramente. La profundidad es de hoja, no de tarjeta.

### Shadow Vocabulary

- **Hoja de recibo** (`box-shadow: 0 1px 2px rgb(31 31 31 / 0.06), 0 12px 28px -14px rgb(31 31 31 / 0.22)`): `.recibo`.
- **Hoja de pila** (`box-shadow: 0 1px 2px rgb(31 31 31 / 0.1)`): las dos hojas bajo el recibo en edición, desplazadas 7 y 14 px y escaladas a 0.97 y 0.94 (la de abajo al 75% de opacidad).
- **Tecla y botón** (Tailwind `shadow-sm`): teclas, botón primario, botones secundarios, selector de idioma.

### Named Rules

**The Paper Only Rule.** La sombra suave es del papel. No hay sombras de color ni desplazadas duras.

## Shapes

Esquinas generosas y redondas: 16 px para recibos, teclas, botones y campos (`rounded-2xl`); píldora completa para chips y selector de idioma. La perforación es una línea punteada de 2 px (tinta al 20%) con dos muescas circulares de 24 px que muerden los bordes del papel. En el historial, los talones se separan con el mismo punteado y muescas de 24 px en los bordes. Entre el número y el monto de cada talón hay un divisor punteado vertical.

## Components

### Buttons

- **Shape:** esquina de 16 px.
- **Primary:** azul de sello, texto blanco, 20 px bold, 64 px de alto a todo el ancho (`h-16`). Deshabilitado al 40% de opacidad. Press: escala 0.98 en 100 ms.
- **Secondary:** papel blanco, texto tinta bold 18 px, 56 px de alto, con sombra; sirve para "Copiar link de pago".
- **Demo:** solo borde (tinta al 25%), texto tinta al 80%, 48-56 px; marca acciones simuladas ("Simular que ya pagó (demo)").
- **Enlace:** azul bold con subrayado desplazado 4 px.
- **Focus:** anillo global de 3 px azul con 3 px de separación (`:focus-visible`).

### Keypad

Cuadrícula 3x4 de teclas blancas de 64 px, 24 px bold, sombra suave; la tecla borrar lleva un ícono de SVG. Press: escala 0.95 y fondo tertiary al 40%.

### Chips

- **Concepto:** píldora de 44 px, neutral con texto tinta; seleccionado: tinta con texto blanco (`aria-pressed`).
- **Estado:** píldora pequeña bold. Cobrado: azul/blanco. Esperando: tertiary/tinta. Vencido: solo borde tinta al 30%.
- **Idioma (ES/EN):** cápsula blanca con dos segmentos de 44 px; activo en tinta.

### Recibo (componente firma)

Contenedor blanco de 16 px de radio con la sombra de hoja. Se compone de cuerpo, `.perforacion`, y talón; el talón de la pantalla de cobro entra con la animación de rasgado (revelado con `clip-path`, 0.55 s, ease-out-expo). En edición se apilan dos hojas debajo (`.pila`). En /pagar, /p y los estados de error también se usa como contenedor.

### Sello

Marca de tinta en SVG, azul de sello, doble aro, borde y grano irregulares por filtro de turbulencia, rotado -7 grados, texto en mayúsculas. Entra con escala 1.5 a 1 en 0.4 s. Marca "Cobrado" y el éxito del pagador.

### Inputs / Fields

- **Código de 6 dígitos:** neutral, 64 px, texto centrado de 36 px bold con tracking 0.3em; dentro de un recibo.
- **Wallet:** papel blanco, 56 px, con sombra suave. Error: texto de ayuda en crítico y bold, con `aria-invalid`; el estado también se dice con texto.

### Historial (talones)

Lista dentro de un recibo; cada fila de al menos 64 px: número con divisor punteado, monto bold, concepto y hora, chip de estado.

### Latido

Pulso de opacidad (1 a 0.35, 1.4 s) para "Esperando que pague…" y pasos pendientes.

### Tope progress (plus)

Componente de plus, fuera del flujo principal (PRODUCT.md lo lista como topes tributarios). Tarjeta blanca de 16 px con barra de 12 px en píldora sobre neutral; barra y etiqueta cambian entre azul (Vas bien), ámbar (Atención) y rojo (Muy cerca / superado), siempre con etiqueta de texto. Ninguna pantalla lo renderiza todavía, y es el único lugar donde viven atencion y critico.

## Do's and Don'ts

### Do:

- **Do** componer cada pantalla nueva como papel sobre `neutral`: un `.recibo`, perforación entre cuerpo y talón, un solo botón primario.
- **Do** mostrar el monto como el elemento más grande, en 700 y con cifras tabulares.
- **Do** mantener los objetivos táctiles en 44 px o más, y los botones de acción en 56-64 px.
- **Do** acompañar todo estado con texto además del color.
- **Do** envolver las animaciones nuevas en el bloque `prefers-reduced-motion` y usar `--ease-out-expo`.

### Don't:

- **Don't** convertir la pantalla en calculadora con lista de transacciones ni en dashboard de métricas (rechazo confirmado en la dirección).
- **Don't** introducir un segundo acento ni degradados; el azul de sello es el único.
- **Don't** usar sombras duras desplazadas ni de color; la única sombra es la de hoja de papel.
- **Don't** pintar las muescas con un color distinto al del fondo.
- **Don't** usar lenguaje de banco o de DIAN en el texto de pantalla (voz de tienda, de PRODUCT.md).
