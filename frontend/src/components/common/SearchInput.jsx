import React from 'react';

export default function SearchInput({
  className = '',
  inputClassName = '',
  iconClassName = 'fa-solid fa-magnifying-glass',
  type = 'search',
  ...props
}) {
  const wrapperClass = ['search-input', className].filter(Boolean).join(' ');
  const fieldClass = ['w-full bg-transparent focus:outline-none', inputClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass} role="search">
      <i className={iconClassName} aria-hidden="true" />
      <input
        type={type}
        className={fieldClass}
        {...props}
      />
    </div>
  );
}
