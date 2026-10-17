import { ImageResponse } from "next/og";

/** Ícono de Trivo para la pantalla de inicio de iPhone y iPad: la "T" sobre marino. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1a33",
      }}
    >
      <svg width="128" height="128" viewBox="0 0 100 100">
        <path
          d="M8 44V32c0-6.6 5.4-12 12-12h70.5c1.7 0 2.9 1.7 2.4 3.3C89.6 34.6 80.4 44 68 44Z"
          fill="#00a3bf"
        />
        <path
          d="M47 44c6.5-6.2 11.6-14.8 15.4-24h28.1c1.7 0 2.9 1.7 2.4 3.3C89.6 34.6 80.4 44 68 44Z"
          fill="#5fd8e8"
        />
        <path
          d="M44 44h14v33c0 3.6-1.8 6.9-4.8 8.8l-10.6 6.8c-2 1.3-4.6-.1-4.6-2.5V55c0-4.9 2.4-8.6 6-11Z"
          fill="#00a3bf"
        />
      </svg>
    </div>,
    size,
  );
}
