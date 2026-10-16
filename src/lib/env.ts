import { z } from "zod";

const schema = z.object({
  OPEN_PAYMENTS_CLIENT_WALLET_URL: z
    .url()
    .refine((u) => u.startsWith("https://") && !u.endsWith("/"), {
      message: "must start with https:// and have no trailing slash",
    }),
  OPEN_PAYMENTS_KEY_ID: z.string().min(1),
  // Path to the PEM private key. Never commit the key; mount it on the server.
  OPEN_PAYMENTS_PRIVATE_KEY_PATH: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.url(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parse once, on first use, so `next build` does not need secrets. */
export function getEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  if (source === process.env && cached) return cached;
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${fields}`);
  }
  if (source === process.env) cached = result.data;
  return result.data;
}
