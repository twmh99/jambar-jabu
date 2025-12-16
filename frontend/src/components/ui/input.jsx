import React from "react";

const composeRequiredMessage = (props, override) => {
  if (override) return override;
  const label =
    props["data-field-label"] ||
    props["aria-label"] ||
    props.placeholder ||
    props.name ||
    "Field ini";
  return `${label} wajib diisi.`;
};

export const Input = React.forwardRef(
  (
    {
      className = "",
      requiredMessage,
      fieldLabel,
      typeInvalidMessage,
      onInvalid,
      onInput,
      ...props
    },
    ref
  ) => {
    const message = composeRequiredMessage(props, requiredMessage || fieldLabel);
    const invalidFormatMessage =
      typeInvalidMessage ||
      (props.type === "email"
        ? "Gunakan format email yang valid (sertakan '@')."
        : "Format input tidak valid.");

    const handleInvalid = React.useCallback(
      (event) => {
        event.preventDefault();
        const validity = event.target.validity;
        let custom = "";
        if (validity.valueMissing) {
          custom = message;
        } else if (validity.typeMismatch || validity.patternMismatch) {
          custom = invalidFormatMessage;
        }
        event.target.setCustomValidity(custom);
        if (onInvalid) onInvalid(event);
      },
      [message, invalidFormatMessage, onInvalid]
    );

    const handleInput = React.useCallback(
      (event) => {
        const validity = event.target.validity;
        if (
          event.target.value &&
          (validity.typeMismatch || validity.patternMismatch)
        ) {
          event.target.setCustomValidity(invalidFormatMessage);
        } else {
          event.target.setCustomValidity("");
        }
        if (onInput) onInput(event);
      },
      [invalidFormatMessage, onInput]
    );

    return (
      <input
        ref={ref}
        className={["ds-input", className].join(" ")}
        onInvalid={handleInvalid}
        onInput={handleInput}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Label = ({ className = "", children, ...props }) => (
  <label className={["ds-label", className].join(" ")} {...props}>
    {children}
  </label>
);

export const Select = React.forwardRef(({
  className = "",
  children,
  onChange,
  requiredMessage,
  fieldLabel,
  onInvalid,
  onInput,
  ...props
}, ref) => {
  const [open, setOpen] = React.useState(false);
  const message = composeRequiredMessage(props, requiredMessage || fieldLabel);

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

  const handleInvalid = React.useCallback(
    (event) => {
      if (props.required) {
        event.target.setCustomValidity(message);
      }
      if (onInvalid) onInvalid(event);
    },
    [message, onInvalid, props.required]
  );

  const handleInput = React.useCallback(
    (event) => {
      event.target.setCustomValidity("");
      if (onInput) onInput(event);
    },
    [onInput]
  );

  return (
    <select
      ref={ref}
      className={["ds-input", open ? "ds-select-open" : "", className].join(" ")}
      onChange={handleChange}
      onFocus={() => setOpen(true)}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      onInvalid={handleInvalid}
      onInput={handleInput}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";
