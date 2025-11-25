import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const customer_id = Number(form.get("customer_id"));
  const type = String(form.get("type")||"EARN");
  const points = Number(form.get("points")||0);
  const note = form.get("note") ? String(form.get("note")) : null;
  await query("INSERT INTO rewards (customer_id,type,points,note) VALUES ($1,$2,$3,$4)", [customer_id, type, points, note]);
  if (type === "EARN") {
    await query("UPDATE customers SET points = points + $1 WHERE id=$2", [points, customer_id]);
  } else {
    await query("UPDATE customers SET points = GREATEST(points - $1,0) WHERE id=$2", [points, customer_id]);
  }
  return NextResponse.redirect(new URL("/reward", req.url));
}

export async function GET() {
  const { rows } = await query("SELECT * FROM rewards ORDER BY created_at DESC");
  return NextResponse.json(rows);
}
