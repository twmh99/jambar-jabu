import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const expectsJson = (req: NextRequest) =>
  req.headers.get("x-requested-with") === "fetch";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  await query(
    "ALTER TABLE menus ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 4"
  );
  const { id } = await props.params;
  const formData = await req.formData();
  const method = String(formData.get("_method") || "").toUpperCase();

  if (method === "DELETE") {
    await query("DELETE FROM menus WHERE id = $1", [id]);
    if (expectsJson(req)) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.redirect(new URL("/menu", req.url));
  }

  if (method === "PUT") {
    const name = String(formData.get("name") || "").trim();
    const price = Number(formData.get("price") || 0);
    const image_url = (formData.get("image_url") as string | null) || null;
    const ratingRaw = formData.get("rating");
    let rating = ratingRaw ? Number(ratingRaw) : 4;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) rating = 4;

    await query(
      "UPDATE menus SET name = $1, price = $2, image_url = $3, rating = $4 WHERE id = $5",
      [name, price, image_url, rating, id]
    );

    if (expectsJson(req)) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.redirect(new URL("/menu", req.url));
  }

  return NextResponse.json({ error: "Metode tidak didukung" }, { status: 400 });
}
