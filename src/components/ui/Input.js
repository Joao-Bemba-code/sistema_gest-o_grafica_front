import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

const Input = forwardRef(function Input(
  { className, type, icon, ...props },
  ref
) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Icon name={icon} className="text-lg" />
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50",
          icon && "pl-10",
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});

const Select = forwardRef(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  );
});

export { Input, Select };
