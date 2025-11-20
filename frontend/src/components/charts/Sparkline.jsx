import React, { useMemo, useState } from "react";

export const Sparkline = ({
  data = [],
  stroke = "hsl(var(--accent))",
  height = 180,
}) => {
  if (!data.length) return null;

  // Mendukung format angka dan { label, value }
  const pointsRaw = data.map((d) => ({
    label: typeof d === "number" ? "" : d.label ?? "",
    value: typeof d === "number" ? d : d.value ?? 0,
  }));

  const values = pointsRaw.map((d) => Number(d.value) || 0);
  const labels = pointsRaw.map((d) => d.label);

  const w = 420;
  const h = height;
  const pad = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Koordinat titik grafik
  const span = Math.max(values.length - 1, 1);
  const chartHeight = h - pad * 2;
  const points = useMemo(
    () =>
      values.map((v, i) => {
        const x = values.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / span;
        const y = h - pad - ((v - min) / (max - min || 1)) * chartHeight;
        return { x, y, value: v, label: labels[i] };
      }),
    [values, labels, span, h, pad, chartHeight, max, min]
  );

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const verticalGuides = Math.min(points.length, 6);

  // Tooltip state
  const [hover, setHover] = useState(null);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* ===== Gradien fill area ===== */}
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="8"
            floodColor={stroke}
            floodOpacity="0.25"
          />
        </filter>
      </defs>

      {/* ===== Grid horizontal ===== */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
        const yLine = pad + chartHeight * (1 - ratio);
        const valueLabel = (min + (max - min) * ratio).toFixed(0);
        return (
          <g key={`grid-h-${idx}`}>
            <line
              x1={pad}
              y1={yLine}
              x2={w - pad}
              y2={yLine}
              stroke="hsl(var(--muted))"
              strokeDasharray="4 6"
              strokeOpacity={0.25}
            />
            {idx === 0 || idx === 4 ? (
              <text
                x={w - pad + 10}
                y={yLine + 4}
                fontSize="11"
                fill="hsl(var(--foreground))"
              >
                {valueLabel}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* ===== Grid vertikal ===== */}
      {Array.from({ length: verticalGuides }).map((_, idx) => {
        const ratio = idx / Math.max(verticalGuides - 1, 1);
        const xLine = pad + ratio * (w - pad * 2);
        return (
          <line
            key={`grid-v-${idx}`}
            x1={xLine}
            y1={pad}
            x2={xLine}
            y2={h - pad}
            stroke="hsl(var(--muted))"
            strokeDasharray="6 12"
            strokeOpacity="0.15"
          />
        );
      })}

      {/* ===== Background area shading ===== */}
      {points.length > 1 && (
        <path
          d={
            `M ${points[0].x},${h - pad} ` +
            points.map((p) => `L${p.x},${p.y}`).join(" ") +
            ` L ${points.at(-1).x},${h - pad} Z`
          }
          fill="url(#areaFill)"
          opacity="0.6"
        />
      )}

      {/* ===== Garis grafik ===== */}
      {points.length > 1 ? (
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2000"
          strokeDashoffset="2000"
          filter="url(#shadow)"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="2000"
            to="0"
            dur="0.8s"
            fill="freeze"
          />
          <animate
            attributeName="opacity"
            from="0"
            to="1"
            dur="0.5s"
            fill="freeze"
          />
          <set attributeName="points" to={polyPoints} />
        </polyline>
      ) : (
        <g>
          <line
            x1={pad}
            y1={points[0].y}
            x2={w - pad}
            y2={points[0].y}
            stroke={stroke}
            strokeWidth="2"
            strokeDasharray="6 6"
            opacity="0.45"
          />
          <circle
            cx={points[0].x}
            cy={points[0].y}
            r={8}
            fill="#fff"
            stroke={stroke}
            strokeWidth="4"
            filter="url(#shadow)"
          />
        </g>
      )}

      {/* ===== Titik + Label nilai + Hover tooltip ===== */}
      {points.map((p, i) => (
        <g
          key={i}
          onMouseEnter={() => setHover(p)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        >
          {/* titik */}
          <circle
            cx={p.x}
            cy={p.y}
            r={5}
            fill={stroke}
            stroke="white"
            strokeWidth="2"
          />

          {/* angka kecil di atas titik */}
          <text
            x={p.x}
            y={p.y - 12}
            textAnchor="middle"
            fontSize="12"
            fill="hsl(var(--foreground))"
            fontWeight="600"
          >
            {p.value}
          </text>

          {/* label X (minggu) */}
          <text
            x={p.x}
            y={h - pad + 18}
            textAnchor="middle"
            fontSize="11"
            fill="hsl(var(--muted-foreground))"
            fontWeight="500"
          >
            {p.label}
          </text>
        </g>
      ))}

      {/* ===== Tooltip (floating box) ===== */}
      {hover && (
        (() => {
          const tooltipText = `${hover.label || ""}`.trim()
            ? `${hover.label}: ${hover.value}`
            : `${hover.value}`;
          const tooltipWidth = Math.min(
            Math.max(tooltipText.length * 7 + 20, 70),
            w - 20
          );
          const tooltipX = Math.min(
            Math.max(hover.x - tooltipWidth / 2, 10),
            w - tooltipWidth - 10
          );
          const tooltipY = Math.max(hover.y - 55, 10);
          return (
            <g>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height="30"
                rx="8"
                fill="rgba(15,23,42,0.85)"
              />
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + 19}
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight="500"
              >
                {tooltipText}
              </text>
            </g>
          );
        })()
      )}
    </svg>
  );
};
