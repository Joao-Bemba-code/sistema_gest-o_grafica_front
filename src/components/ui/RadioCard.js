import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

function RadioCard({ selected, onChange, icon, title, description, id, name }) {
  return (
    <button
      type="button"
      role="radio"
      id={id}
      name={name}
      aria-checked={selected}
      onClick={onChange}
      className={cn(
        "ds-motion min-h-touch flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left",
        selected
          ? "border-primary bg-primary/5 text-primary"
          : "border-outline-variant/50 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon name={icon} className="text-lg" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary bg-primary" : "border-muted-foreground/40"
        )}
      >
        {selected && <Icon name="check" className="text-xs text-on-primary" />}
      </span>
    </button>
  );
}

export { RadioCard };
