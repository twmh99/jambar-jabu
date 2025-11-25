import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const expectsJson = (req: NextRequest) =>
  req.headers.get("x-requested-with") === "fetch";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const email = form.get("email")
    ? String(form.get("email")).trim() || null
    : null;
  const phone = form.get("phone")
    ? String(form.get("phone")).trim() || null
    : null;

  if (!name) {
    const message = "Nama pelanggan wajib diisi.";
    if (expectsJson(req)) {
      return NextResponse.json({ error: message, field: "name" }, { status: 400 });
    }
    const redirectUrl = new URL("/pelanggan?error=name_required", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (email && !email.includes("@")) {
    const message = "Alamat email harus valid.";
    if (expectsJson(req)) {
      return NextResponse.json({ error: message, field: "email" }, { status: 400 });
    }
    const redirectUrl = new URL("/pelanggan?error=email_invalid", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (phone) {
    const { rows: dup } = await query(
      "SELECT id FROM customers WHERE phone = $1 LIMIT 1",
      [phone]
    );
    if (dup.length > 0) {
      const message = "Nomor telepon sudah terdaftar.";
    if (expectsJson(req)) {
      return NextResponse.json({ error: message, field: "phone" }, { status: 400 });
    }
      const redirectUrl = new URL(
        "/pelanggan?error=phone_taken",
        req.url
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  const { rows } = await query(
    "INSERT INTO customers (name,email,phone) VALUES ($1,$2,$3) RETURNING *",
    [name, email, phone]
  );

  if (expectsJson(req)) {
    return NextResponse.json(rows[0]);
  }

  return NextResponse.redirect(new URL("/pelanggan", req.url));
}

export async function GET() {
  const { rows } = await query(
    "SELECT * FROM customers ORDER BY created_at DESC"
  );
  return NextResponse.json(rows);
}
