import { getCircleServerConfig } from "./config.server";

const COOKIE_NAME = "morrow_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type PersistedCircleSession = {
  userToken: string;
  refreshToken: string;
  deviceId: string;
};

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sessionKey() {
  const circle = getCircleServerConfig();
  if (!circle.configured) throw new Error("Circle Wallets are not configured on this deployment.");
  const material = process.env.MORROW_SESSION_SECRET?.trim() || circle.apiKey;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`morrow-circle-session-v1:${material}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealCircleSession(session: PersistedCircleSession) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await sessionKey(),
    encoder.encode(JSON.stringify(session)),
  );
  const payload = new Uint8Array(iv.length + encrypted.byteLength);
  payload.set(iv);
  payload.set(new Uint8Array(encrypted), iv.length);
  return base64UrlEncode(payload);
}

export async function openCircleSession(value: string | null) {
  if (!value) return null;
  try {
    const payload = base64UrlDecode(value);
    if (payload.length <= 12) return null;
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: payload.slice(0, 12) },
      await sessionKey(),
      payload.slice(12),
    );
    const parsed = JSON.parse(decoder.decode(decrypted)) as Partial<PersistedCircleSession>;
    return parsed.userToken && parsed.refreshToken && parsed.deviceId
      ? (parsed as PersistedCircleSession)
      : null;
  } catch {
    return null;
  }
}

export function readCircleSessionCookie(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function circleSessionCookie(request: Request, value: string, maxAge = COOKIE_MAX_AGE) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearCircleSessionCookie(request: Request) {
  return circleSessionCookie(request, "", 0);
}
