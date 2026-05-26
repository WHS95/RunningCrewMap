// src/lib/server/storeSession.ts
import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "store_session";
const MAX_AGE_SECS = 60 * 60 * 24 * 30; // 30일

interface StoreSessionPayload {
  storeId: string;
  pinSetAt: string; // ISO. DB의 pin_set_at과 일치해야 유효.
  iat: number;
}

function getSecret(): string {
  const s = process.env.STORE_SESSION_SECRET || process.env.CREW_SESSION_SECRET;
  if (!s)
    throw new Error(
      "STORE_SESSION_SECRET (or CREW_SESSION_SECRET fallback) is not set"
    );
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createStoreSessionToken(storeId: string, pinSetAt: string) {
  const payload: StoreSessionPayload = {
    storeId,
    pinSetAt,
    iat: Math.floor(Date.now() / 1000),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = sign(body);
  return `${body}.${sig}`;
}

export async function setStoreSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECS,
  });
}

export async function clearStoreSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getStoreSession(): Promise<StoreSessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  if (sign(body) !== sig) return null;
  try {
    return JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as StoreSessionPayload;
  } catch {
    return null;
  }
}
