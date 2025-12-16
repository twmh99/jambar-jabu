import React from 'react';

export const Table = ({ children, className = '', scrollClassName = '' }) => (
  <div
    className={[
      "w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0px_10px_25px_rgba(15,23,42,0.08)] overflow-hidden",
      className,
    ].join(' ')}
  >
    <div className={["overflow-x-auto rounded-2xl", scrollClassName].join(' ')}>
      <table className="w-full border-collapse text-sm text-[hsl(var(--foreground))]/90">
        {children}
      </table>
    </div>
  </div>
);

export const THead = ({ children, className = '' }) => (
  <thead className={["bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-b border-[hsl(var(--border))]", className].join(' ')}>
    {children}
  </thead>
);

export const TBody = ({ children }) => (
  <tbody className="divide-y divide-[hsl(var(--border))]">{children}</tbody>
);

export const TR = ({ children, className = '', onClick }) => (
  <tr
    onClick={onClick}
    className={[
      "odd:bg-[hsl(var(--card))] even:bg-[hsl(var(--muted))/0.18] hover:bg-[hsl(var(--accent))/0.2] transition [&:has(th)]:bg-[hsl(var(--muted))]",
      onClick ? "cursor-pointer" : "",
      className,
    ].join(' ')}
  >
    {children}
  </tr>
);

export const TH = ({ children, className = '' }) => (
  <th
    className={[
      "text-left font-semibold px-4 py-2 text-[hsl(var(--foreground))] bg-[hsl(var(--muted))]",
      className,
    ].join(' ')}
  >
    {children}
  </th>
);

export const TD = ({ children, className = '' }) => (
  <td className={["px-4 py-2 align-top", className].join(' ')}>{children}</td>
);
