import React from 'react';

export const Progress = ({ value = 0 }) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-3 bg-[hsl(var(--muted))] rounded-[var(--radius-sm)] overflow-hidden">
      <div
        className="h-full bg-[hsl(var(--accent))] transition-[width] duration-300"
        style={{ width: pct + '%' }}
      />
    </div>
  );
};
