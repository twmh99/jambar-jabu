import React from 'react';

export const Pie = ({ values = [], colors = [] }) => {
  const size = 120; const stroke = 14; const r = (size - stroke) / 2; const C = 2 * Math.PI * r;
  const total = values.reduce((a,b)=>a+b,0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="komposisi">
      <g transform={`translate(${size/2} ${size/2})`}>
        {values.map((v, i) => {
          const frac = v / total; const dash = C * frac; const gap = C - dash; const rot = (offset / total) * 360; offset += v;
          return (
            <circle key={i} r={r} fill="none" stroke={colors[i] || 'hsl(var(--muted-foreground))'} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`} transform={`rotate(${rot})`} />
          );
        })}
      </g>
    </svg>
  );
};
