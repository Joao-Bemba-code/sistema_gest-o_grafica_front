"use client";

// Renderização condicional (nunca esconder com CSS: os gráficos recharts mediriam 0).
export default function Bloco({ id, vista, children }) {
  if (!vista?.visivel(id)) return null;
  return <>{children}</>;
}
