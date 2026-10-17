import { cn } from "@/lib/utils";

// Cabeçalho de página padrão: título com peso claro, subtítulo discreto.
export default function PageHeader({ titulo, descricao, children, className }) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
