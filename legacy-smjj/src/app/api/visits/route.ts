import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const customer_id = Number(form.get("customer_id"));
  const total_spend = Number(form.get("total_spend"));
  const earned = Math.floor(total_spend / 1000);
  await query("INSERT INTO visits (customer_id,total_spend,earned_pts) VALUES ($1,$2,$3)", [customer_id, total_spend, earned]);
  await query("UPDATE customers SET total_visits = total_visits + 1, points = points + $1 WHERE id=$2", [earned, customer_id]);
  await query("INSERT INTO rewards (customer_id,type,points,note) VALUES ($1,'EARN',$2,$3)", [customer_id, earned, "Poin otomatis dari kunjungan"]);
  return NextResponse.redirect(new URL("/riwayat", req.url));
}

export async function GET() {
  const { rows } = await query("SELECT * FROM visits ORDER BY visited_at DESC");
  return NextResponse.json(rows);
}
