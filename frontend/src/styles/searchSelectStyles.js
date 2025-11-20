const searchSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderRadius: 12,
    borderColor: '#000',
    outline: 'none',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(0,0,0,0.7)' : 'none',
    backgroundColor: 'hsl(var(--card))',
    minHeight: 48,
    paddingLeft: 4,
    paddingRight: 4,
    transition: 'box-shadow 0.2s ease',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '4px 12px',
    gap: 6,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
    fontWeight: 500,
  }),
  input: (provided) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
    outline: 'none',
    boxShadow: 'none',
    border: 'none',
    backgroundColor: 'transparent',
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused
      ? 'rgba(71, 85, 105, 0.9)'
      : 'hsl(var(--muted-foreground))',
    paddingRight: 12,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (provided) => ({
    ...provided,
    borderRadius: 14,
    border: '1px solid #000',
    backgroundColor: 'hsl(var(--card))',
    boxShadow: '0 25px 55px -25px rgba(15, 23, 42, 0.45)',
    overflow: 'hidden',
    zIndex: 50,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary))'
      : state.isFocused
        ? 'hsl(var(--muted))'
        : 'transparent',
    color: state.isSelected ? '#fff' : 'hsl(var(--foreground))',
    cursor: 'pointer',
    padding: '10px 16px',
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'hsl(var(--muted))',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    ':hover': {
      backgroundColor: 'transparent',
      color: 'hsl(var(--primary))',
    },
  }),
};

export default searchSelectStyles;
