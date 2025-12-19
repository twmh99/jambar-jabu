import React from "react";

const fmt = (val = 0, digits = 1) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export default function WorkProgress({
  hours = 0,
  target = 40,
  daysWorked = 0,
  daysTarget = 6,
}) {
  const pct = Math.min(100, Math.max(0, (hours / target) * 100));
  const remaining = Math.max(0, target - hours);
  const hoursPerDay = daysWorked ? hours / daysWorked : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Progress Minggu Ini
          </p>
          <p className="text-3xl font-semibold text-primary">
            {fmt(hours)} <span className="text-base text-muted-foreground">/ {target} jam</span>
          </p>
        </div>
        <div className="text-right text-sm space-y-1">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              remaining > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {remaining > 0 ? `${fmt(remaining)} jam lagi` : "Target tercapai!"}
          </span>
          <div className="text-xs text-muted-foreground">
            {daysWorked} hari aktif • rata-rata {fmt(hoursPerDay)} jam/hari
          </div>
        </div>
      </div>

      <div className="w-full h-4 rounded-full bg-[hsl(var(--muted))]/40 overflow-hidden shadow-inner">
        <div
          className="h-full transition-all duration-500 ease-in-out rounded-full"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 100%)",
          }}
        />
      </div>
    </div>
  );
}
