import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const expectsJson = (req: NextRequest) =>
  req.headers.get("x-requested-with") === "fetch";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const form = await req.formData();
  const method = String(form.get("_method") || "").toUpperCase();

  if (method === "DELETE") {
    await query("DELETE FROM customers WHERE id=$1", [id]);
    if (expectsJson(req)) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.redirect(new URL("/pelanggan", req.url));
  }

  if (method === "PUT") {
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
      const redirectUrl = new URL(`/pelanggan/edit/${id}?error=name_required`, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (email && !email.includes("@")) {
      const message = "Alamat email harus valid.";
      if (expectsJson(req)) {
        return NextResponse.json({ error: message, field: "email" }, { status: 400 });
      }
      const redirectUrl = new URL(`/pelanggan/edit/${id}?error=email_invalid`, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (phone) {
      const { rows: dup } = await query(
        "SELECT id FROM customers WHERE phone = $1 AND id <> $2 LIMIT 1",
        [phone, id]
      );
      if (dup.length > 0) {
        const message = "Nomor telepon sudah terdaftar.";
        if (expectsJson(req)) {
          return NextResponse.json({ error: message, field: "phone" }, { status: 400 });
        }
        const redirectUrl = new URL(`/pelanggan/edit/${id}?error=phone_taken`, req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    await query(
      "UPDATE customers SET name=$1, email=$2, phone=$3 WHERE id=$4",
      [name, email, phone, id]
    );

    if (expectsJson(req)) {
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.redirect(new URL("/pelanggan", req.url));
}
