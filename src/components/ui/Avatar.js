import { cn, getInitials } from "@/lib/utils";

// Tons sóbrios (paleta de dados do tema) para avatares tipo "foto"
const TONS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
];

function tomDoNome(nome = "") {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return TONS[hash % TONS.length];
}

export default function Avatar({ nome = "", tamanho = "md", className }) {
  const tam = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-6 w-6 text-[9px]",
    md: "h-8 w-8 text-[11px]",
    lg: "h-10 w-10 text-xs",
  }[tamanho];
  return (
    <span
      title={nome}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-card",
        tam,
        className
      )}
      style={{ backgroundColor: tomDoNome(nome) }}
    >
      {getInitials(nome)}
    </span>
  );
}

export function AvatarStack({ nomes = [], max = 6, tamanho = "md", className }) {
  const visiveis = nomes.slice(0, max);
  const restantes = nomes.length - visiveis.length;
  return (
    <span className={cn("flex items-center", className)}>
      {visiveis.map((n, i) => (
        <span key={`${n}-${i}`} className={i > 0 ? "-ml-2" : ""}>
          <Avatar nome={n} tamanho={tamanho} />
        </span>
      ))}
      {restantes > 0 && (
        <span className="-ml-2">
          <Avatar nome={`+${restantes}`} tamanho={tamanho} />
        </span>
      )}
    </span>
  );
}
