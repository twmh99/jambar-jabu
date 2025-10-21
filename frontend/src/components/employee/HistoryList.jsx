import React from "react";

/**
 * Komponen daftar riwayat kehadiran pegawai (7 hari terakhir)
 * @param {Array} items - Data riwayat {tanggal, status}
 */
export default function HistoryList({ items = [] }) {
  if (!items?.length) {
    return (
      <div className="text-[hsl(var(--muted-foreground))] italic">
        Belum ada data kehadiran
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[hsl(var(--muted))] text-sm">
      {items.map((it, i) => (
        <li
          key={i}
          className="py-2 flex items-center justify-between hover:bg-[hsl(var(--muted))]/20 px-2 rounded-md transition"
        >
          <span className="font-medium">{it.tanggal}</span>
          <span
            className={
              it.status === "Hadir"
                ? "ds-badge bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))]"
                : it.status === "Terlambat"
                ? "ds-badge bg-[hsl(var(--warning))] text-[hsl(var(--accent-foreground))]"
                : "ds-badge bg-[hsl(var(--muted))]"
            }
          >
            {it.status || "-"}
          </span>
        </li>
      ))}
    </ul>
  );
}
