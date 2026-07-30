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
          "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50",
          icon && "pl-10",
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});

export { Input };
