"use client";

import { useEffect, useState } from "react";
import { listarFaturas, validarFatura, abrirAnexoFatura } from "@/services/faturacao";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Ledger";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";

function kz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function dataCurta(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function AnaliseFaturasTab() {
  const { addToast } = useToast();
  const [faturas, setFaturas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [validando, setValidando] = useState(null);

  const carregar = async () => {
    try {
      const d = await listarFaturas({ estado: "em_analise" });
      setFaturas(Array.isArray(d) ? d : d?.data || []);
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao carregar faturas em análise", "error");
      setFaturas([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValidar = async (f) => {
    setValidando(f.id);
    try {
      await validarFatura(f.id);
      addToast?.(`Fatura ${f.numero || f.id} validada e emitida`, "success");
      setFaturas((prev) => prev.filter((x) => x.id !== f.id));
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao validar fatura", "error");
    } finally {
      setValidando(null);
    }
  };

  if (carregando) return <ListSkeleton count={5} />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Icon name="fact_check" className="text-info" />
          Faturas em análise
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Faturas aprovadas no Comercial. Valide para as emitir (passam a contar como dívida e seguem para a AGT).
        </p>
      </CardHeader>
      <CardContent>
        {faturas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            Não existem faturas em análise.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Factura</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Emissão</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-left font-medium">Anexos</th>
                  <th className="px-3 py-2 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f) => (
                  <tr key={f.id} className="border-t border-border/70">
                    <td className="px-3 py-2 font-medium text-foreground">{f.numero || `#${f.id}`}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-40 truncate">{f.cliente?.nome || f.cliente?.empresa || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{dataCurta(f.data_emissao)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{kz(f.total || f.valor)}</td>
                    <td className="px-3 py-2">
                      {(f.anexos || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {f.anexos.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => abrirAnexoFatura(a.id).catch(() => addToast?.("Erro ao abrir anexo", "error"))}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/70"
                              title={a.nome_original}
                            >
                              <Icon name="attach_file" className="text-[11px]" /> {a.nome_original}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" onClick={() => handleValidar(f)} loading={validando === f.id}>
                        <Icon name="check" className="text-sm" /> Validar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}