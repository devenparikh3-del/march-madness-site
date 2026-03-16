import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "march_madness_admin";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || "march-madness-admin";
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(candidate: string) {
  const expected = getAdminPassword();

  if (!expected || !candidate) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function getAdminSessionToken() {
  const password = getAdminPassword();

  if (!password) {
    return "";
  }

  return hashValue(`${password}:${getSessionSecret()}`);
}

export function isValidAdminSession(token?: string | null) {
  const expected = getAdminSessionToken();

  if (!expected || !token) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);

  if (expectedBuffer.length !== tokenBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, tokenBuffer);
}
