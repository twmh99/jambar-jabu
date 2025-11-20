import React from 'react';

const base = 'ds-btn';

const variants = {
  primary: 'ds-btn-primary',
  accent: 'ds-btn-accent',
  outline: 'ds-btn-outline',
  neutral: 'btn-neutral',
  ghost: 'bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
};

export const Button = ({ variant = 'primary', className = '', children, ...props }) => (
  <button className={[base, variants[variant] || '', className].join(' ')} {...props}>
    {children}
  </button>
);
