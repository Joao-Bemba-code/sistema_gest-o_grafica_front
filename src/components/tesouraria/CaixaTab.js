"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import NumeroInput from "@/components/ui/NumeroInput";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerHeader,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { listarContas } from "@/services/contasBancarias";
import { listarSessoesCaixa, abrirCaixa, fecharCaixa } from "@/services/caixa";
import { podeAtual } from "@/lib/permissoes";
import { inputCls } from "@/lib/estoque";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatDataHora(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function rotuloConta(conta) {
  if (!conta) return "—";
  return `${conta.banco_nome}${conta.numero_conta ? ` — ${conta.numero_conta}` : ""}`;
}

const formAbrirVazio = { conta_bancaria_id: "", valor_abertura: "", observacoes: "" };

export default function CaixaTab() {
  const { addToast } = useToast();
  const [sessoes, setSessoes] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [formAbrir, setFormAbrir] = useState(formAbrirVazio);
  const [sessaoFechar, setSessaoFechar] = useState(null);
  const [formFechar, setFormFechar] = useState({ valor_fecho: "", observacoes: "" });
  const [filtroConta, setFiltroConta] = useState("");

  const podeCriar = podeAtual("tesouraria", "criar");
  const podeEditar = podeAtual("tesouraria", "editar");

  const carregar = async () => {
    try {
      const [listaSessoes, listaContas] = await Promise.all([
        listarSessoesCaixa(),
        listarContas().catch(() => []),
      ]);
      setSessoes(Array.isArray(listaSessoes) ? listaSessoes : []);
      setContas(Array.isArray(listaContas) ? listaContas : []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar caixas", "error");
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const contasAtivas = contas.filter((c) => c.ativo !== false);
  const abertas = sessoes.filter((s) => s.estado === "aberto");
  const historico = useMemo(
    () => (filtroConta
      ? sessoes.filter((s) => String(s.conta_bancaria_id) === String(filtroConta))
      : sessoes),
    [sessoes, filtroConta]
  );
  const { visiveis, ...pag } = usePaginacao({ items: historico, tamanhoInicial: 10 });

  const totalEsperado = abertas.reduce((s, x) => s + Number(x.resumo?.esperado || 0), 0);

  const abrirModalAbertura = () => {
    const caixa = contasAtivas.find((c) => c.tipo_conta === "caixa") || contasAtivas[0];
    setFormAbrir({ ...formAbrirVazio, conta_bancaria_id: caixa ? String(caixa.id) : "" });
    setModalAbrir(true);
  };

  const handleAbrir = async (e) => {
    e.preventDefault();
    if (!formAbrir.conta_bancaria_id) {
      addToast("Escolha a conta ou caixa a abrir", "error");
      return;
    }
    setSalvando(true);
    try {
      await abrirCaixa({
        conta_bancaria_id: Number(formAbrir.conta_bancaria_id),
        valor_abertura: Number(formAbrir.valor_abertura) || 0,
        observacoes: formAbrir.observacoes,
      });
      addToast("Caixa aberto com sucesso", "success");
      setModalAbrir(false);
      setFormAbrir(formAbrirVazio);
      await carregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao abrir caixa", "error");
    } finally {
      setSalvando(false);
    }
  };

  const abrirModalFecho = (sessao) => {
    setSessaoFechar(sessao);
    setFormFechar({ valor_fecho: "", observacoes: "" });
  };

  const valorEsperado = Number(sessaoFechar?.resumo?.esperado || 0);
  const valorContado = Number(formFechar.valor_fecho) || 0;
  const diferencaPrevista = formFechar.valor_fecho === "" ? null : valorContado - valorEsperado;

  const handleFechar = async (e) => {
    e.preventDefault();
    if (!sessaoFechar) return;
    if (formFechar.valor_fecho === "" || valorContado < 0) {
      addToast("Indique o valor contado no fecho", "error");
      return;
    }
    setSalvando(true);
    try {
      const resposta = await fecharCaixa(sessaoFechar.id, {
        valor_fecho: valorContado,
        observacoes: formFechar.observacoes,
      });
      const dif = Number(resposta?.diferenca || 0);
      const mensagem = dif === 0
        ? "Caixa fechado sem diferença"
        : dif > 0
          ? `Caixa fechado com sobra de ${formatKz(dif)}`
          : `Caixa fechado com falta de ${formatKz(Math.abs(dif))}`;
      addToast(mensagem, dif === 0 ? "success" : dif > 0 ? "info" : "warning");
      setSessaoFechar(null);
      setFormFechar({ valor_fecho: "", observacoes: "" });
      await carregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao fechar caixa", "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
            <Icon name="lock_open" className="text-base text-warning" />
            {abertas.length} caixa(s) aberto(s)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
            <Icon name="payments" className="text-base text-success" />
            Esperado: <strong className="text-foreground">{formatKz(totalEsperado)}</strong>
          </span>
        </div>
        {podeCriar && (
          <button
            type="button"
            onClick={abrirModalAbertura}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Icon name="lock_open" className="text-base" /> Abrir caixa
          </button>
        )}
      </div>

      {loading ? (
        <ListSkeleton count={3} />
      ) : abertas.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Caixas abertos">
          {abertas.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{rotuloConta(s.conta)}</p>
                  <p className="text-[11px] text-muted-foreground">Aberto em {formatDataHora(s.data_abertura)} por {s.usuario_abertura_nome || "—"}</p>
                </div>
                <StatusBadge tom="warning">Aberto</StatusBadge>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Abertura</p>
                  <p className="truncate text-sm font-bold tabular-nums text-foreground">{formatKz(s.valor_abertura)}</p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Movimentos</p>
                  <p className="truncate text-sm font-bold tabular-nums text-success">+{Math.round(Number(s.resumo?.entradas || 0)).toLocaleString("pt-AO")}</p>
                  <p className="truncate text-[11px] font-semibold tabular-nums text-error">−{Math.round(Number(s.resumo?.saidas || 0)).toLocaleString("pt-AO")}</p>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Esperado</p>
                  <p className="truncate text-sm font-black tabular-nums text-foreground">{formatKz(s.resumo?.esperado)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
                <span className="truncate text-[11px] text-muted-foreground">{s.observacoes_abertura || "Sem observações"}</span>
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => abrirModalFecho(s)}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    <Icon name="lock" className="text-sm" /> Fechar caixa
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted-foreground">
            <Icon name="lock_open" className="text-xl" />
          </span>
          <p className="text-sm font-medium text-foreground">Nenhum caixa aberto</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Abra o caixa no início do turno para controlar o dinheiro contado.</p>
        </div>
      )}

      <Ledger rotulo="Histórico de caixas">
        <LedgerHeader
          titulo="Histórico de sessões"
          subtitulo={`${historico.length} sessões de caixa`}
        />
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
          <select
            value={filtroConta}
            onChange={(e) => setFiltroConta(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Filtrar por conta ou caixa"
          >
            <option value="">Todas as contas e caixas</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{rotuloConta(c)}</option>
            ))}
          </select>
        </div>
        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh>Sessão</LedgerTh>
              <LedgerTh>Conta / Caixa</LedgerTh>
              <LedgerTh>Responsável</LedgerTh>
              <LedgerTh className="text-right">Abertura</LedgerTh>
              <LedgerTh className="text-right">Esperado</LedgerTh>
              <LedgerTh className="text-right">Contado</LedgerTh>
              <LedgerTh className="text-right">Diferença</LedgerTh>
              <LedgerTh>Estado</LedgerTh>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((s) => {
              const dif = Number(s.diferenca || 0);
              return (
                <LedgerTr key={s.id}>
                  <LedgerTd className="whitespace-nowrap">
                    <IdCell
                      id={new Date(s.data_abertura).toLocaleDateString("pt-BR")}
                      meta={formatDataHora(s.data_abertura)}
                    />
                  </LedgerTd>
                  <LedgerTd className="max-w-40"><span className="block truncate text-muted-foreground">{rotuloConta(s.conta)}</span></LedgerTd>
                  <LedgerTd className="max-w-40">
                    <span className="block truncate text-xs">{s.usuario_abertura_nome || "—"}</span>
                    {s.usuario_fecho_nome && <span className="block truncate text-[10px] text-muted-foreground">Fecho: {s.usuario_fecho_nome}</span>}
                  </LedgerTd>
                  <LedgerTd className="text-right tabular-nums whitespace-nowrap">{Math.round(Number(s.valor_abertura || 0)).toLocaleString("pt-AO")}</LedgerTd>
                  <LedgerTd className="text-right tabular-nums whitespace-nowrap">
                    {s.estado === "aberto" ? Math.round(Number(s.resumo?.esperado || 0)).toLocaleString("pt-AO") : Math.round(Number(s.valor_esperado || 0)).toLocaleString("pt-AO")}
                  </LedgerTd>
                  <LedgerTd className="text-right tabular-nums whitespace-nowrap">
                    {s.valor_fecho == null ? "—" : Math.round(Number(s.valor_fecho)).toLocaleString("pt-AO")}
                  </LedgerTd>
                  <LedgerTd className="text-right whitespace-nowrap">
                    {s.estado === "aberto" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : dif === 0 ? (
                      <span className="font-semibold text-success">0</span>
                    ) : (
                      <span className={`font-bold ${dif > 0 ? "text-info" : "text-error"}`}>
                        {dif > 0 ? "+" : "−"}{Math.abs(dif).toLocaleString("pt-AO")}
                      </span>
                    )}
                  </LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom={s.estado === "aberto" ? "warning" : "neutral"}>
                      {s.estado === "aberto" ? "Aberto" : "Fechado"}
                    </StatusBadge>
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {historico.length === 0 && (
          <LedgerEmpty icone="lock">Nenhuma sessão de caixa registada</LedgerEmpty>
        )}
        <Paginacao {...pag} label="sessões" />
      </Ledger>

      <Modal
        open={modalAbrir}
        onClose={() => setModalAbrir(false)}
        title="Abrir caixa"
        icon="lock_open"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModalAbrir(false)}>Cancelar</Button>
            <Button type="submit" form="form-abrir-caixa" loading={salvando}>Abrir caixa</Button>
          </>
        }
      >
        <form id="form-abrir-caixa" onSubmit={handleAbrir} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conta / Caixa *</label>
            <select
              required
              value={formAbrir.conta_bancaria_id}
              onChange={(e) => setFormAbrir((p) => ({ ...p, conta_bancaria_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">Escolher conta ou caixa...</option>
              {contasAtivas.map((c) => (
                <option key={c.id} value={c.id}>{rotuloConta(c)}{c.tipo_conta === "caixa" ? " (Caixa)" : ""}</option>
              ))}
            </select>
            {contasAtivas.length === 0 && (
              <p className="text-[11px] text-warning">Crie primeiro um Caixa na aba “Contas e Caixa”.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor de abertura (Kz) *</label>
            <NumeroInput
              required
              value={formAbrir.valor_abertura}
              onChange={(e) => setFormAbrir((p) => ({ ...p, valor_abertura: e.target.value }))}
              className={inputCls}
              placeholder="Dinheiro contado no início do turno"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
            <textarea
              rows={3}
              value={formAbrir.observacoes}
              onChange={(e) => setFormAbrir((p) => ({ ...p, observacoes: e.target.value }))}
              className={inputCls}
              placeholder="Ex: troco inicial, responsável do turno..."
            />
          </div>
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
            O valor esperado no fecho soma as entradas e subtrai as saídas confirmadas nesta conta desde a abertura.
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(sessaoFechar)}
        onClose={() => setSessaoFechar(null)}
        title="Fechar caixa"
        icon="lock"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setSessaoFechar(null)}>Cancelar</Button>
            <Button type="submit" form="form-fechar-caixa" loading={salvando}>Fechar caixa</Button>
          </>
        }
      >
        {sessaoFechar && (
          <form id="form-fechar-caixa" onSubmit={handleFechar} className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">{rotuloConta(sessaoFechar.conta)}</p>
              <p className="text-[11px] text-muted-foreground">Aberto em {formatDataHora(sessaoFechar.data_abertura)} por {sessaoFechar.usuario_abertura_nome || "—"}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-muted-foreground">Abertura</dt>
                  <dd className="font-semibold tabular-nums">{formatKz(sessaoFechar.valor_abertura)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-muted-foreground">Entradas / Saídas</dt>
                  <dd className="font-semibold tabular-nums"><span className="text-success">+{Math.round(Number(sessaoFechar.resumo?.entradas || 0)).toLocaleString("pt-AO")}</span> <span className="text-error">−{Math.round(Number(sessaoFechar.resumo?.saidas || 0)).toLocaleString("pt-AO")}</span></dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase text-muted-foreground">Esperado</dt>
                  <dd className="font-bold tabular-nums text-foreground">{formatKz(sessaoFechar.resumo?.esperado)}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor contado no fecho (Kz) *</label>
              <NumeroInput
                required
                value={formFechar.valor_fecho}
                onChange={(e) => setFormFechar((p) => ({ ...p, valor_fecho: e.target.value }))}
                className={inputCls}
                placeholder="Dinheiro contado agora"
              />
            </div>
            {diferencaPrevista !== null && (
              <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                diferencaPrevista === 0
                  ? "border-success/25 bg-success/10 text-success"
                  : diferencaPrevista > 0
                    ? "border-info/25 bg-info/10 text-info"
                    : "border-error/25 bg-error/10 text-error"
              }`}>
                <span className="font-medium">
                  {diferencaPrevista === 0 ? "Sem diferença" : diferencaPrevista > 0 ? "Sobra" : "Falta"}
                </span>
                <span className="font-bold tabular-nums">{formatKz(Math.abs(diferencaPrevista))}</span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações do fecho</label>
              <textarea
                rows={3}
                value={formFechar.observacoes}
                onChange={(e) => setFormFechar((p) => ({ ...p, observacoes: e.target.value }))}
                className={inputCls}
                placeholder="Justificação de sobras ou faltas..."
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
