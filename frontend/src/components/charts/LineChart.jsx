import React, { useMemo, useState } from "react";

export const LineChart = ({
  data = [],
  width = 620,
  height = 220,
  color = "hsl(var(--accent))",
}) => {
  if (!data.length) return null;

  const normalized = data.map((item, idx) => {
    if (typeof item === "number") {
      const label = `Mg ${idx + 1}`;
      return { label, tooltip: label, value: item };
    }

    const axisLabel = item.axisLabel || item.label || `Mg ${idx + 1}`;
    const tooltip = item.tooltip || axisLabel;
    const value = Number(item.value ?? 0);
    return { label: axisLabel, tooltip, value: Number.isFinite(value) ? value : 0 };
  });

  const values = normalized.map((pt) => pt.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin;
  const min = range === 0 ? Math.max(0, rawMin - 1) : Math.min(0, rawMin);
  const max = range === 0 ? rawMax + 1 : rawMax;

  const margin = { top: 24, right: 24, bottom: 36, left: 44 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const denominator = Math.max(values.length - 1, 1);

  const points = useMemo(
    () =>
      normalized.map((pt, idx) => {
        const x = margin.left + (idx * innerWidth) / denominator;
        const ratio = (pt.value - min) / (max - min || 1);
        const y = margin.top + innerHeight - ratio * innerHeight;
        return { ...pt, x, y };
      }),
    [normalized, denominator, innerWidth, innerHeight, margin.left, margin.top, min, max]
  );

  const polyLine = points.map((pt) => `${pt.x},${pt.y}`).join(" ");
  const [hover, setHover] = useState(null);

  const yTicks = 4;
  const yValues = Array.from({ length: yTicks + 1 }).map((_, idx) => {
    const ratio = idx / yTicks;
    return min + (max - min) * (1 - ratio);
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
    >
      <defs>
        <linearGradient id="lineChartArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area background */}
      {points.length > 1 && (
        <path
          d={
            `M ${points[0].x},${margin.top + innerHeight} ` +
            points.map((pt) => `L${pt.x},${pt.y}`).join(" ") +
            ` L${points.at(-1).x},${margin.top + innerHeight} Z`
          }
          fill="url(#lineChartArea)"
          opacity="0.8"
        />
      )}

      {/* Horizontal grid + y-axis labels */}
      {yValues.map((val, idx) => {
        const ratio = (val - min) / (max - min || 1);
        const y = margin.top + innerHeight - ratio * innerHeight;
        return (
          <g key={`y-${idx}`}>
            <line
              x1={margin.left}
              y1={y}
              x2={width - margin.right}
              y2={y}
              stroke="hsl(var(--muted))"
              strokeDasharray="4 6"
              strokeOpacity={0.3}
            />
            <text
              x={margin.left - 10}
              y={y + 4}
              fontSize="11"
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
            >
              {Math.round(val)}
            </text>
          </g>
        );
      })}

      {/* Vertical axis */}
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={margin.top + innerHeight}
        stroke="hsl(var(--border))"
      />
      <line
        x1={margin.left}
        y1={margin.top + innerHeight}
        x2={width - margin.right}
        y2={margin.top + innerHeight}
        stroke="hsl(var(--border))"
      />

      {/* Line */}
      {points.length > 1 && (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyLine}
        />
      )}

      {/* Points */}
      {points.map((pt, idx) => (
        <g
          key={`pt-${idx}`}
          onMouseEnter={() => setHover(pt)}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        >
          <circle
            cx={pt.x}
            cy={pt.y}
            r={5}
            fill="#fff"
            stroke={color}
            strokeWidth="3"
          />
          <text
            x={pt.x}
            y={pt.y - 10}
            fontSize="12"
            fill="hsl(var(--foreground))"
            textAnchor="middle"
            fontWeight="600"
          >
            {pt.value}
          </text>
          {pt.label && (
            <text
              x={pt.x}
              y={margin.top + innerHeight + 18}
              fontSize="11"
              fill="hsl(var(--muted-foreground))"
              textAnchor="middle"
              transform={`rotate(-30 ${pt.x} ${margin.top + innerHeight + 18})`}
            >
              {pt.label}
            </text>
          )}
        </g>
      ))}

      {/* Tooltip */}
      {hover && (
        (() => {
          const tooltip = `${hover.tooltip || hover.label}: ${hover.value}`;
          const tooltipWidth = Math.min(
            Math.max(tooltip.length * 7 + 20, 90),
            width - 20
          );
          const tooltipX = Math.min(
            Math.max(hover.x - tooltipWidth / 2, 10),
            width - tooltipWidth - 10
          );
          const tooltipY = Math.max(hover.y - 45, 10);
          return (
            <g>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height="32"
                rx="6"
                fill="rgba(15,23,42,0.85)"
              />
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + 20}
                fontSize="12"
                fill="#fff"
                textAnchor="middle"
              >
                {tooltip}
              </text>
            </g>
          );
        })()
      )}
    </svg>
  );
};
