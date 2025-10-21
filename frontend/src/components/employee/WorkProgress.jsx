import React from "react";

/**
 * Komponen Progress Bar untuk menunjukkan jam kerja mingguan pegawai
 * @param {number} hours - Total jam kerja yang sudah dicapai
 * @param {number} target - Target jam kerja (default 40)
 */
export default function WorkProgress({ hours = 0, target = 40 }) {
  const pct = Math.min(100, Math.max(0, (hours / target) * 100));

  return (
    <div className="space-y-2">
      {/* Label progress */}
      <div className="text-sm text-[hsl(var(--muted-foreground))]">
        {hours} jam dari target {target} jam
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 rounded-full bg-[hsl(var(--muted))]/40 overflow-hidden shadow-inner">
        <div
          className="h-full transition-all duration-500 ease-in-out rounded-full"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, hsl(var(--accent)) 0%, hsl(var(--primary)) 100%)",
          }}
        />
      </div>
    </div>
  );
}
