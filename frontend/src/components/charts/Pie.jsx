import React, { useState } from "react";

export const Pie = ({
  values = [],
  labels = [],
  colors = [],
  size = 130,
  strokeWidth = 16,
}) => {
  const stroke = strokeWidth;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;

  const total = values.reduce((a, b) => a + b, 0) || 1;

  let offset = 0;
  const [hover, setHover] = useState(null);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
      {/* ===== PIE SVG ===== */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full h-auto"
      >
        <g transform={`translate(${size / 2} ${size / 2})`}>
          {values.map((v, i) => {
            const frac = v / total;
            const dash = C * frac;
            const gap = C - dash;
            const rotate = (offset / total) * 360;
            offset += v;

            // posisi teks nilai di tengah slice
            const midAngle = (rotate + frac * 180) * (Math.PI / 180);
            const textX = Math.cos(midAngle) * (r - 20);
            const textY = Math.sin(midAngle) * (r - 20);

            return (
              <g
                key={i}
                onMouseEnter={() => setHover({ label: labels[i], value: v })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                {/* slice */}
                <circle
                  r={r}
                  fill="none"
                  stroke={colors[i] || "hsl(var(--muted-foreground))"}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${gap}`}
                  transform={`rotate(${rotate})`}
                  opacity={hover?.label === labels[i] ? 1 : 0.85}
                />

                {/* angka di dalam slice */}
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  fontSize="12"
                  fill="hsl(var(--foreground))"
                  fontWeight="600"
                >
                  {v}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ===== LEGEND ===== */}
      <div className="space-y-2 w-full">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-sm justify-start"
          >
            <div
              className="w-3 h-3 rounded-full border"
              style={{ background: colors[i], borderColor: colors[i] || "hsl(var(--border))" }}
            />
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {labels[i] || `Shift ${i + 1}`}
            </span>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              ({v} • {Math.round((v / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
