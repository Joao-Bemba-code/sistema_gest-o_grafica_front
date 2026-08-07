import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

function FormSection({ title, description, icon, step, children, className }) {
  return (
    <fieldset className={cn("rounded-2xl border border-outline-variant/30 bg-card p-4 sm:p-6", className)}>
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {step ? (
            <span className="text-sm font-bold">{step}</span>
          ) : (
            <Icon name={icon || "label"} className="text-lg" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

export { FormSection };
