import { cn } from "@/lib/utils";

function FormField({ label, required, error, hint, children, className }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
      {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
    </div>
  );
}

export { FormField };
