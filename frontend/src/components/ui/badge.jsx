import React from 'react';

export const Badge = ({ className = '', children }) => (
  <span className={["ds-badge", className].join(' ')}>{children}</span>
);
