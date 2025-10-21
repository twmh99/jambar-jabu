import React from 'react';

export const Table = ({ children, className = '' }) => (
  <div className={["overflow-x-auto w-full", className].join(' ')}>
    <table className="w-full text-sm">
      {children}
    </table>
  </div>
);

export const THead = ({ children }) => (
  <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
    {children}
  </thead>
);

export const TBody = ({ children }) => <tbody className="divide-y divide-[hsl(var(--border))]">{children}</tbody>;

export const TR = ({ children }) => <tr className="hover:bg-[hsl(var(--muted)/0.4)]">{children}</tr>;

export const TH = ({ children, className = '' }) => (
  <th className={["text-left font-medium px-4 py-2", className].join(' ')}>{children}</th>
);

export const TD = ({ children, className = '' }) => (
  <td className={["px-4 py-2 align-top", className].join(' ')}>{children}</td>
);
