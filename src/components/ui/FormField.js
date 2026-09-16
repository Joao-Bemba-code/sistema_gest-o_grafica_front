import { cn } from "@/lib/utils";

function FormField({ label, obrigatorio, error, hint, children, full, className }) {
  return (
    <label className={cn("flex flex-col gap-1.5", full && "sm:col-span-2", className)}>
      {label && (
        <span className="cyber-label">
          {label}
          {obrigatorio && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
        </span>
      )}
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
      {error && <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-destructive" />{error}</p>}
    </label>
  );
}

export { FormField };
