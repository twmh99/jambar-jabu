import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { query } from "@/lib/db";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plain: string, stored: string) {
  if (!stored?.includes(":")) {
    return plain === stored;
  }
  const [salt, originalHash] = stored.split(":");
  const hashedBuffer = Buffer.from(originalHash, "hex");
  const derived = scryptSync(plain, salt, 64);
  if (hashedBuffer.length !== derived.length) return false;
  return timingSafeEqual(derived, hashedBuffer);
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const removeAvatar = form.get("removeAvatar") === "1";
  const avatarFile = form.get("avatar");
  const currentPassword = String(form.get("currentPassword") || "");
  const newPassword = String(form.get("newPassword") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (!name) {
    return NextResponse.json({ error: "Nama wajib diisi.", field: "name" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Alamat email harus valid.", field: "email" }, { status: 400 });
  }

  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT", []);

  const normalizedEmail = email.toLowerCase();
  const { rows: emailDup } = await query(
    "SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1",
    [normalizedEmail, sessionUser.id]
  );
  if (emailDup.length > 0) {
    return NextResponse.json(
      { error: "Email sudah digunakan pengguna lain.", field: "email" },
      { status: 400 }
    );
  }

  let avatarValue: string | null | undefined = undefined;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Ukuran foto maksimal 2MB.", field: "avatar" },
        { status: 400 }
      );
    }
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = avatarFile.type || "image/png";
    avatarValue = `data:${mime};base64,${buffer.toString("base64")}`;
  } else if (removeAvatar) {
    avatarValue = null;
  }

  const updates: string[] = [];
  const values: any[] = [];

  values.push(name);
  updates.push(`name = $${values.length}`);

  values.push(normalizedEmail);
  updates.push(`email = $${values.length}`);

  if (avatarValue !== undefined) {
    if (avatarValue === null) {
      updates.push("avatar_data = NULL");
    } else {
      values.push(avatarValue);
      updates.push(`avatar_data = $${values.length}`);
    }
  }

  if (newPassword || confirmPassword || currentPassword) {
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter.", field: "newPassword" },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Konfirmasi password tidak sama.", field: "confirmPassword" },
        { status: 400 }
      );
    }
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Masukkan password saat ini.", field: "currentPassword" },
        { status: 400 }
      );
    }
    const { rows: pwdRows } = await query(
      "SELECT password FROM users WHERE id = $1",
      [sessionUser.id]
    );
    const storedPwd = pwdRows[0]?.password;
    if (!storedPwd || !verifyPassword(currentPassword, storedPwd)) {
      return NextResponse.json(
        { error: "Password saat ini salah.", field: "currentPassword" },
        { status: 400 }
      );
    }
    values.push(hashPassword(newPassword));
    updates.push(`password = $${values.length}`);
  }

  values.push(sessionUser.id);
  const { rows } = await query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${
      values.length
    } RETURNING id, email, name, role, avatar_data`,
    values
  );
  const updated = rows[0];

  return NextResponse.json({ user: updated });
}
