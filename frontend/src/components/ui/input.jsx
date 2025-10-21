import React from 'react';

export const Input = ({ className = '', ...props }) => (
  <input
    className={['ds-input', className].join(' ')}
    {...props}
  />
);

export const Label = ({ className = '', children, ...props }) => (
  <label
    className={['ds-label', className].join(' ')}
    {...props}
  >
    {children}
  </label>
);

export const Select = ({ className = '', children, ...props }) => (
  <select
    className={['ds-input', className].join(' ')}
    {...props}
  >
    {children}
  </select>
);
