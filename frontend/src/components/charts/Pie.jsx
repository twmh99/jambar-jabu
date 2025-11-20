import React, { useState } from "react";

export const Pie = ({
  values = [],
  labels = [],
  colors = [],
  size = 150,
  legendSide = false,
}) => {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const [hover, setHover] = useState(null);

  const parseHexColor = (color) => {
    if (!color) return null;
    const hex = color.replace("#", "");
    if (hex.length !== 6) return null;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  };

  const getTextColor = (color) => {
    const rgb = parseHexColor(color);
    if (!rgb) return "white";
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 / 255;
    return brightness < 0.6 ? "#ffffff" : "#111827";
  };

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
  };

  let angleCursor = 0;
  const segments = values.map((v, i) => {
    const frac = v / total;
    const sliceAngle = frac * 360;
    const start = angleCursor;
    const end = start + sliceAngle;
    const mid = start + sliceAngle / 2;
    angleCursor = end;
    return {
      value: v,
      label: labels[i] || `Item ${i + 1}`,
      color: colors[i] || "hsl(var(--muted-foreground))",
      start,
      end,
      mid,
      frac,
    };
  });

  const radius = size / 2;
  const textRadius = radius * 0.5;

  const containerClass = legendSide
    ? "flex flex-col sm:flex-row sm:items-start gap-6 w-full"
    : "flex flex-col items-center gap-4 w-full";

  return (
    <div className={containerClass}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full h-auto"
      >
        {segments.map((seg, i) => {
          const path = describeArc(radius, radius, radius, seg.start, seg.end);
          return (
            <path
              key={i}
              d={path}
              fill={seg.color}
              opacity={hover?.label === seg.label ? 1 : 0.9}
              onMouseEnter={() => setHover({ label: seg.label, value: seg.value })}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
        {segments.map((seg, i) => {
          if (seg.frac < 0.12) return null;
          const pos = polarToCartesian(radius, radius, textRadius, seg.mid);
          const pct = Math.round(seg.frac * 100);
          const fill = getTextColor(seg.color);
          const baseSize = size * 0.06;
          const labelSize = Math.max(10, Math.min(baseSize, baseSize * seg.frac * 1.6));
          const detailSize = Math.max(9, labelSize - 2);
          return (
            <text
              key={`lbl-${i}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              className="font-semibold drop-shadow"
              fill={fill}
              style={{ fontSize: labelSize }}
            >
              {seg.label}
              <tspan
                x={pos.x}
                dy={detailSize * 1.1}
                className="font-medium"
                style={{ fontSize: detailSize }}
                fill={fill}
              >
                {`${seg.value} | ${pct}%`}
              </tspan>
            </text>
          );
        })}
      </svg>

      <div className="space-y-2.5 w-full flex flex-col justify-center items-start">
        {values.map((v, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm">
            <div
              className="mt-1 w-2.5 h-2.5 rounded-full border"
              style={{ background: colors[i], borderColor: colors[i] || "hsl(var(--border))" }}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-[hsl(var(--foreground))] leading-snug">
                {labels[i] || `Shift ${i + 1}`}
              </span>
              <span className="text-[12px] text-[hsl(var(--muted-foreground))] leading-snug">
                Jumlah: {v} | {Math.round((v / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
