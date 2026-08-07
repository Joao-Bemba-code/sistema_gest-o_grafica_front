"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";
import { maskValue, maskMaxLength } from "@/lib/masks";

const STATE_META = {
  error: { icon: "error" },
  success: { icon: "check_circle" },
  warning: { icon: "warning" },
};

const STATE_TEXT = {
  error: "text-error",
  success: "text-success",
  warning: "text-warning",
};

const TextField = forwardRef(function TextField(
  {
    className,
    label,
    required,
    placeholder,
    value = "",
    onChange,
    onFocus,
    onBlur,
    state = "default",
    message,
    helper,
    mask,
    icon,
    endIcon,
    multiline,
    rows = 4,
    id: idProp,
    ...props
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const id = idProp || generatedId;
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const helperId = `${id}-helper`;

  const hasValue = Boolean(value && String(value).length);
  const floated = focused || hasValue;
  const isError = state === "error";
  const meta = STATE_META[state];
  const showStatusIcon = meta && hasValue;
  const describeBy = isError
    ? (message ? messageId : undefined)
    : state === "success" && hasValue
      ? messageId
      : helper
        ? helperId
        : undefined;

  const handleChange = (e) => {
    if (mask) {
      e.target.value = maskValue(e.target.value, mask);
    }
    onChange?.(e);
  };

  const handleFocus = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const wrapperClass = cn(
    "ds-motion relative w-full rounded-xl border bg-background/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
    !multiline && "h-12",
    state === "default" && "border-outline-variant/50 hover:border-muted-foreground/50",
    isError && "border-error/80 focus-within:border-error focus-within:ring-error/15",
    state === "success" && "border-success/70",
    state === "warning" && "border-warning/70",
    props.disabled && "cursor-not-allowed bg-muted/50 opacity-60 hover:border-input",
    className
  );

  const controlClass = cn(
    "h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50",
    multiline ? "resize-none px-4 pb-3 pt-6" : "px-4",
    icon ? "pl-11" : "",
    (showStatusIcon || endIcon) ? "pr-11" : "",
    props.disabled && "cursor-not-allowed"
  );

  const labelClass = cn(
    "ds-motion absolute z-10 flex items-center gap-0.5 rounded-[4px] bg-background px-1 pointer-events-none select-none",
    multiline
      ? floated
        ? "left-4 top-1.5 text-[10px]"
        : "left-4 top-3 text-sm"
      : floated
        ? "left-4 top-1.5 text-[10px] font-semibold uppercase tracking-wide"
        : "left-4 top-1/2 -translate-y-1/2 text-sm",
    isError ? "text-error" : focused ? "text-primary" : "text-muted-foreground"
  );

  const inputPlaceholder = focused || hasValue ? placeholder : " ";

  const commonProps = {
    id,
    value,
    placeholder: inputPlaceholder,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    "aria-labelledby": label ? labelId : undefined,
    "aria-describedby": describeBy,
    "aria-invalid": isError || undefined,
    className: controlClass,
  };

  return (
    <div className="w-full">
      <div className={wrapperClass}>
        {icon && (
          <span
            className={cn(
              "pointer-events-none absolute z-10 text-muted-foreground",
              multiline ? "top-3 left-3.5" : "left-3.5 top-1/2 -translate-y-1/2"
            )}
          >
            <Icon name={icon} className="text-lg" />
          </span>
        )}

        {multiline ? (
          <textarea ref={ref} rows={rows} {...commonProps} {...props} />
        ) : (
          <input
            ref={ref}
            {...commonProps}
            {...props}
          />
        )}

        {label && (
          <label id={labelId} htmlFor={id} className={labelClass}>
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}

        {showStatusIcon && (
          <span
            className={cn(
              "pointer-events-none absolute right-3 z-10",
              STATE_TEXT[state],
              multiline ? "top-3" : "top-1/2 -translate-y-1/2"
            )}
          >
            <Icon name={meta.icon} className="text-lg" />
          </span>
        )}

        {endIcon && !showStatusIcon && (
          <span
            className={cn(
              "pointer-events-none absolute right-3 z-10 text-muted-foreground",
              multiline ? "top-3" : "top-1/2 -translate-y-1/2"
            )}
          >
            <Icon name={endIcon} className="text-lg" />
          </span>
        )}
      </div>

      <div className="flex min-h-[18px] items-start gap-1.5 px-1 pt-1 text-[11px] leading-tight">
        {isError && message && (
          <p id={messageId} role="alert" className="animate-msg-in flex items-start gap-1 text-error">
            <Icon name="error" className="mt-px shrink-0 text-[13px]" />
            <span>{message}</span>
          </p>
        )}
        {state === "warning" && !isError && message && (
          <p id={messageId} className="animate-msg-in flex items-start gap-1 text-warning">
            <Icon name="warning" className="mt-px shrink-0 text-[13px]" />
            <span>{message}</span>
          </p>
        )}
        {state === "success" && hasValue && !isError && (
          <p id={messageId} className="animate-msg-in flex items-start gap-1 text-success">
            <Icon name="check_circle" className="mt-px shrink-0 text-[13px]" />
            <span>{message || "Tudo certo"}</span>
          </p>
        )}
        {focused && !isError && helper && !(state === "success" && hasValue) && (
          <p id={helperId} className="animate-msg-in flex items-start gap-1 text-muted-foreground">
            <Icon name="info" className="mt-px shrink-0 text-[13px]" />
            <span>{helper}</span>
          </p>
        )}
      </div>
    </div>
  );
});

export { TextField };
