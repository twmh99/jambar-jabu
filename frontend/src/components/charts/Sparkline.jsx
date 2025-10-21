import React from 'react';

export const Sparkline = ({ data = [], stroke = 'hsl(var(--accent))' }) => {
  if (!data.length) return null;
  const w = 220, h = 60, pad = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const points = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const y = h - pad - ((d - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} role="img" aria-label="tren">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
    </svg>
  );
};
