import React from 'react';

export const Card = ({ className = '', children }) => (
  <div className={["ds-card w-full overflow-hidden", className].join(' ')}>{children}</div>
);

export const CardHeader = ({ className = '', children }) => (
  <div className={["p-4 sm:p-6 border-b border-[hsl(var(--border))]", className].join(' ')}>{children}</div>
);

export const CardTitle = ({ className = '', children }) => (
  <h3 className={["text-lg font-semibold leading-snug", className].join(' ')}>{children}</h3>
);

export const CardDescription = ({ className = '', children }) => (
  <p className={["text-sm text-[hsl(var(--muted-foreground))]", className].join(' ')}>{children}</p>
);

export const CardContent = ({ className = '', children }) => (
  <div className={["p-4 sm:p-6", className].join(' ')}>{children}</div>
);

export const CardFooter = ({ className = '', children }) => (
  <div className={["p-4 sm:p-6 border-t border-[hsl(var(--border))]", className].join(' ')}>{children}</div>
);
