import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const expectsJson = (req: NextRequest) =>
  req.headers.get("x-requested-with") === "fetch";

// helper simple buat parse CSV
function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(","); // sederhana, cukup untuk format basic
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] || "").replace(/^"|"$/g, "").trim();
    });
    rows.push(row);
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "File tidak ditemukan" },
      { status: 400 }
    );
  }

  const text = await file.text();
  let records: any[] = [];

  // Cek JSON vs CSV
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    // JSON mode → sesuai spesifikasi yang kamu tulis
    const json = JSON.parse(trimmed);

    if (Array.isArray(json)) {
      records = json;
    } else if (Array.isArray(json.data)) {
      records = json.data;
    } else {
      return NextResponse.json(
        { error: "Struktur JSON tidak dikenali" },
        { status: 400 }
      );
    }
  } else {
    // CSV mode
    records = parseCsv(text);
  }

  // Proses tiap baris transaksi
  for (const row of records) {
    // Sesuaikan nama field dengan spesifikasi kamu
    const nama =
      row.nama_pelanggan || row.customer_name || row.nama || null;
    const email =
      row.email ||
      row.email_pelanggan ||
      row.mail ||
      null;
    const phone =
      row.nomor_telepon || row.phone || row.no_hp || null;
    const tanggalRaw =
      row.tanggal_transaksi || row.visited_at || row.tanggal || null;
    const total =
      Number(row.total_transaksi ?? row.total_spend ?? 0) || 0;
    const poin =
      Number(row.poin_didapat ?? row.earned_pts ?? 0) || 0;

    if (!nama && !phone) {
      // kalau nggak ada nama & no HP, skip
      continue;
    }

    // --- Cari / buat customer ---
    let customerId: number | null = null;

    if (phone) {
      const { rows } = await query(
        "SELECT id, email FROM customers WHERE phone = $1",
        [phone]
      );
      if (rows[0]) {
        customerId = rows[0].id;
        if (email && !rows[0].email) {
          await query(
            "UPDATE customers SET email = $1 WHERE id = $2",
            [email, customerId]
          );
        }
      }
    }

    if (!customerId && nama) {
      // coba cari berdasarkan nama kalau belum ketemu
      const { rows } = await query(
        "SELECT id, email FROM customers WHERE name = $1",
        [nama]
      );
      if (rows[0]) {
        customerId = rows[0].id;
        if (email && !rows[0].email) {
          await query(
            "UPDATE customers SET email = $1 WHERE id = $2",
            [email, customerId]
          );
        }
      }
    }

    if (!customerId) {
      // buat pelanggan baru
      const { rows } = await query(
        "INSERT INTO customers (name, email, phone, total_visits, points) VALUES ($1,$2,$3,0,0) RETURNING id",
        [nama || "Tanpa Nama", email, phone]
      );
      customerId = rows[0].id;
    }

    // --- Insert ke visits ---
    const visitedAt = tanggalRaw
      ? new Date(tanggalRaw)
      : new Date();

    await query(
      "INSERT INTO visits (customer_id, visited_at, total_spend, earned_pts, is_active) VALUES ($1,$2,$3,$4,true)",
      [customerId, visitedAt, total, poin]
    );

    // --- Update summary pelanggan ---
    await query(
      "UPDATE customers SET total_visits = total_visits + 1, points = points + $1 WHERE id = $2",
      [poin, customerId]
    );
  }

  if (expectsJson(req)) {
    return NextResponse.json({ success: true, imported: records.length });
  }

  // Setelah impor selesai balik ke /riwayat
  return NextResponse.redirect(new URL("/riwayat", req.url));
}

