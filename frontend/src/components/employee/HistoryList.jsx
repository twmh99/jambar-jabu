import React from "react";

const statusStyles = {
  Hadir: "bg-emerald-100 text-emerald-700",
  Terlambat: "bg-amber-100 text-amber-800",
  Izin: "bg-sky-100 text-sky-800",
  Alpha: "bg-rose-100 text-rose-700",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

export default function HistoryList({ items = [] }) {
  if (!items?.length) {
    return (
      <div className="text-[hsl(var(--muted-foreground))] italic">
        Belum ada data kehadiran
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const badgeClass =
          statusStyles[it.status] ||
          "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]";
        return (
          <div
            key={i}
            className="rounded-2xl border border-[hsl(var(--muted))] bg-white/60 dark:bg-slate-900/60 shadow-sm px-4 py-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                {formatDate(it.tanggal)}
              </p>
              <p className="text-xs text-gray-500">
                Masuk: <strong>{it.jam_masuk || "—"}</strong> &nbsp;•&nbsp; Pulang:{" "}
                <strong>{it.jam_keluar || "—"}</strong>
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
              {it.status || "-"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
