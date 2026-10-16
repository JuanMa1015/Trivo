import { describe, expect, it } from "vitest";
import { getEnv } from "./env";

const valid = {
  OPEN_PAYMENTS_CLIENT_WALLET_URL: "https://ilp.interledger-test.dev/example",
  OPEN_PAYMENTS_KEY_ID: "key-id",
  OPEN_PAYMENTS_PRIVATE_KEY_PATH: "/run/secrets/private.key",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  APP_BASE_URL: "http://localhost:9028",
};

describe("getEnv", () => {
  it("accepts a complete environment", () => {
    expect(getEnv(valid).OPEN_PAYMENTS_KEY_ID).toBe("key-id");
  });

  it("rejects a $ payment pointer", () => {
    expect(() =>
      getEnv({ ...valid, OPEN_PAYMENTS_CLIENT_WALLET_URL: "$ilp.example/x" }),
    ).toThrow(/OPEN_PAYMENTS_CLIENT_WALLET_URL/);
  });

  it("rejects a trailing slash", () => {
    const bad = {
      ...valid,
      OPEN_PAYMENTS_CLIENT_WALLET_URL: "https://a.dev/x/",
    };
    expect(() => getEnv(bad)).toThrow(/OPEN_PAYMENTS_CLIENT_WALLET_URL/);
  });

  it("names the failing field without leaking secret values", () => {
    const secret = { ...valid, DATABASE_URL: "" };
    expect(() => getEnv(secret)).toThrow(/DATABASE_URL/);
    expect(() => getEnv({ ...valid, OPEN_PAYMENTS_KEY_ID: "" })).not.toThrow(
      /postgresql:\/\/user:pass/,
    );
  });
});
