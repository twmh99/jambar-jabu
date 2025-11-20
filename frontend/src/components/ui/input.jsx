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

export const Select = ({ className = '', children, onChange, ...props }) => {
  const [open, setOpen] = React.useState(false);

  const handleChange = React.useCallback(
    (event) => {
      if (onChange) onChange(event);
      setOpen(false);
    },
    [onChange]
  );

  const handleMouseDown = React.useCallback(() => {
    // Toggle state so icon reflects native open/close
    setOpen((prev) => !prev);
  }, []);

  const handleBlur = React.useCallback(() => setOpen(false), []);

  return (
    <select
      className={["ds-input", open ? "ds-select-open" : "", className].join(" ")}
      onChange={handleChange}
      onFocus={() => setOpen(true)}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      {...props}
    >
      {children}
    </select>
  );
};
