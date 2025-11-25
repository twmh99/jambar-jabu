import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession } from "@/lib/session";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

type Attempt = { count: number; expiresAt: number };
const attempts = new Map<string, Attempt>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function getClientKey(req: NextRequest) {
  return (
    req.ip ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isBlocked(key: string) {
  const info = attempts.get(key);
  if (!info) return false;
  if (Date.now() > info.expiresAt) {
    attempts.delete(key);
    return false;
  }
  return info.count >= RATE_LIMIT_MAX;
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const info = attempts.get(key);
  if (!info || now > info.expiresAt) {
    attempts.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    info.count += 1;
    attempts.set(key, info);
  }
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plain: string, stored: string) {
  if (!stored.includes(":")) {
    return plain === stored;
  }

  const [salt, originalHash] = stored.split(":");
  const hashedBuffer = Buffer.from(originalHash, "hex");
  const derived = scryptSync(plain, salt, 64);

  if (hashedBuffer.length !== derived.length) return false;
  return timingSafeEqual(derived, hashedBuffer);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const rawEmail = String(form.get("email") || "").trim();
  const email = rawEmail.toLowerCase();
  const password = String(form.get("password") || "");
  const clientKey = getClientKey(req);

  if (!rawEmail) {
    return NextResponse.redirect(new URL("/login?error=email_empty", req.url));
  }
  if (!password) {
    return NextResponse.redirect(
      new URL("/login?error=password_empty", req.url)
    );
  }

  if (isBlocked(clientKey)) {
    return NextResponse.redirect(new URL("/login?error=rate", req.url));
  }

  const { rows } = await query(
    "SELECT id, email, name, role, password FROM users WHERE LOWER(email)=$1",
    [email]
  );
  const user = (rows as any)[0];

  if (!user || !verifyPassword(password, user.password)) {
    recordFailedAttempt(clientKey);
    const err = !user ? "email_invalid" : "password_invalid";
    return NextResponse.redirect(new URL(`/login?error=${err}`, req.url));
  }

  // upgrade hash jika masih plaintext
  if (!user.password.includes(":")) {
    const newHash = hashPassword(password);
    await query("UPDATE users SET password=$1 WHERE id=$2", [newHash, user.id]);
  }

  clearAttempts(clientKey);
  await createSession(user.id);
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
