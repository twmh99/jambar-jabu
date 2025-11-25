import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const expectsJson = (req: NextRequest) =>
  req.headers.get("x-requested-with") === "fetch";

export async function POST(req: NextRequest) {
  await query(
    "ALTER TABLE menus ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 4"
  );

  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const price = Number(form.get("price") || 0);
  const image_url = (form.get("image_url") as string | null) || null;
  const ratingRaw = form.get("rating");
  let rating = ratingRaw ? Number(ratingRaw) : 4;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) rating = 4;

  const { rows } = await query(
    "INSERT INTO menus (name, price, image_url, rating, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, name, price, image_url, rating",
    [name, price, image_url, rating]
  );

  if (expectsJson(req)) {
    return NextResponse.json(rows[0]);
  }

  return NextResponse.redirect(new URL("/menu", req.url));
}

export async function GET() {
  await query(
    "ALTER TABLE menus ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 4"
  );
  const { rows } = await query(
    "SELECT id, name, price, image_url, rating, created_at FROM menus WHERE is_active = true ORDER BY created_at DESC"
  );
  return NextResponse.json(rows);
}
