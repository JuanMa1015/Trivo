import { connection } from "next/server";
import { json } from "@/server/http";

/** Liveness para Docker y el deploy. No toca la base de datos a propósito. */
export async function GET() {
  await connection();
  return json({ status: "ok" });
}
