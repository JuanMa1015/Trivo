import type { NextConfig } from "next";

const desarrollo = process.env.NODE_ENV !== "production";

/**
 * Política de contenido: solo se carga lo nuestro, nada puede incrustar la app
 * (una página falsa no puede mostrarla dentro de un marco) y el navegador solo
 * se conecta a nosotros.
 * ponytail: 'unsafe-inline' en scripts porque Next inyecta scripts en línea; el
 * siguiente paso es una CSP con nonce por petición.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${desarrollo ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const cabeceras = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // El token del cobro va en la URL: ningún sitio al que se navegue debe recibirla.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(desarrollo
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabeceras },
      // Las pantallas con token no deben quedar en cachés del navegador ni de proxies.
      {
        source: "/p/:token",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
