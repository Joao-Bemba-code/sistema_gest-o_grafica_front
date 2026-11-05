"use client";

// Registo de serviços executados pela equipa (módulo Recursos Humanos).
// O painel repete linha a linha o bloco de serviço do formulário de
// orçamento — seleccionar serviço, trabalhadores, prazo, valor/hora e
// total — mas aqui cada linha fica gravada na base de dados.
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import RowMenu from "@/components/ui/RowMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { listar, criar, atualizar, remover } from "@/services/servicosExecutados";
import { listar as listarCatalogo } from "@/services/servicos";
import { buscarOrganizacao } from "@/services/configuracoes";
import { podeAtual } from "@/lib/permissoes";

const inputCls =
  "w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

const linhaVazia = { servico_id: "", mob: "1", prazo_execucao: "1", prazo_unidade: "dias", observacoes: "" };

// Mesma regra do backend: 1 dia = 8h; prazo inválido volta às 8h.
function duracaoEmHoras(prazo, unidade) {
  const p = Number(prazo) || 0;
  let horas;
  if (unidade === "minutos") horas = Number((p / 60).toFixed(2));
  else if (unidade === "horas") horas = p;
  else horas = p * 8;
  return horas > 0 ? horas : 8;
}

const unidadeLabel = (valor, unidade) => {
  const n = Number(valor) || 0;
  if (unidade === "minutos") return n === 1 ? "minuto" : "minutos";
  if (unidade === "horas") return n === 1 ? "hora" : "horas";
  return n === 1 ? "dia" : "dias";
};

const kz = (v) => `Kz ${(Number(v) || 0).toLocaleString("pt-AO")}`;

const dataCurta = (valor) => {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function ServicosExecutadosSection() {
  const { addToast } = useToast();
  const [registros, setRegistros] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [valorHoraEmpresa, setValorHoraEmpresa] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(linhaVazia);
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [aEliminarOk, setAEliminarOk] = useState(false);

  const podeCriar = podeAtual("utilizadores", "criar");
  const podeEditar = podeAtual("utilizadores", "editar");
  const podeEliminar = podeAtual("utilizadores", "eliminar");

  const carregar = useCallback(async () => {
    const [registos, itens, org] = await Promise.allSettled([listar(), listarCatalogo(), buscarOrganizacao()]);
    if (registos.status === "fulfilled") {
      setRegistros(Array.isArray(registos.value) ? registos.value : []);
    } else {
      setRegistros([]);
      addToast(registos.reason?.response?.data?.erro || "Erro ao carregar os serviços da equipa", "error");
    }
    if (itens.status === "fulfilled") setCatalogo(Array.isArray(itens.value) ? itens.value.filter((s) => s.ativo !== false) : []);
    if (org.status === "fulfilled") setValorHoraEmpresa(Number(org.value?.valor_hora_servicos) || 0);
    setCarregando(false);
  }, [addToast]);

  useEffect(() => {
    let activo = true;
    (async () => {
      await carregar();
      if (activo) setCarregando(false);
    })();
    return () => { activo = false; };
  }, [carregar]);

  const servico = useMemo(
    () => catalogo.find((s) => String(s.id) === String(form.servico_id)) || null,
    [catalogo, form.servico_id]
  );

  // O valor/hora vem do catálogo; se o serviço não tiver, usa o valor único
  // da empresa (o mesmo critério de Orçamentos).
  const valorHora = Number(servico?.valor_hora) || Number(valorHoraEmpresa) || 0;
  const duracao = duracaoEmHoras(form.prazo_execucao, form.prazo_unidade);
  const total = Number(((Number(form.mob) || 0) * duracao * valorHora).toFixed(2));

  const abrirNovo = () => {
    setForm(linhaVazia);
    setEditando(null);
    setAberto(true);
  };

  const abrirEdicao = (r) => {
    setForm({
      servico_id: r.servico_id ? String(r.servico_id) : "",
      mob: String(r.mob ?? 1),
      prazo_execucao: String(r.prazo_execucao ?? 1),
      prazo_unidade: r.prazo_unidade || "dias",
      observacoes: r.observacoes || "",
    });
    setEditando(r);
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setEditando(null);
    setForm(linhaVazia);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!servico) {
      addToast("Seleccione o serviço executado", "error");
      return;
    }
    const payload = {
      servico_id: servico.id,
      descricao: servico.nome,
      mob: Number(form.mob) || 1,
      prazo_execucao: Number(form.prazo_execucao) || 1,
      prazo_unidade: form.prazo_unidade,
      valor_hora: valorHora,
      observacoes: form.observacoes,
    };
    setGuardando(true);
    try {
      if (editando) {
        await atualizar(editando.id, payload);
        addToast("Serviço atualizado", "success");
      } else {
        await criar(payload);
        addToast("Serviço registado", "success");
      }
      fechar();
      await carregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar o serviço", "error");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminacao = async () => {
    if (!aEliminar) return;
    setAEliminarOk(true);
    try {
      await remover(aEliminar.id);
      addToast("Registo removido", "success");
      setAEliminar(null);
      await carregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover o registo", "error");
    } finally {
      setAEliminarOk(false);
    }
  };

  const totalGeral = useMemo(
    () => registros.reduce((s, r) => s + (Number(r.total) || 0), 0),
    [registros]
  );

  const { visiveis, ...pag } = usePaginacao({ items: registros });

  return (
    <Ledger rotulo="Serviços executados pela equipa">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Serviços da equipa</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {registros.length} registo{registros.length === 1 ? "" : "s"} · total {kz(totalGeral)}
          </p>
        </div>
        {podeCriar && (
          <Button type="button" size="sm" onClick={abrirNovo}>
            <Icon name="add" className="text-base" /> Novo serviço
          </Button>
        )}
      </div>

      {aberto && (
        <form onSubmit={guardar} className="mx-4 mb-3 rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-4 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Serviço</span>
              <select
                value={form.servico_id}
                onChange={(e) => setForm((f) => ({ ...f, servico_id: e.target.value }))}
                className={inputCls}
                aria-label="Seleccionar serviço"
              >
                <option value="">Seleccionar serviço...</option>
                {catalogo.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}{s.categoria?.nome ? ` (${s.categoria.nome})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="col-span-6 sm:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Trabalhadores</span>
              <NumeroInput
                value={form.mob}
                onChange={(e) => setForm((f) => ({ ...f, mob: e.target.value }))}
                className={inputCls}
                placeholder="1"
              />
            </div>
            <div className="col-span-6 sm:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Prazo</span>
              <div className="flex flex-col gap-1.5">
                <NumeroInput
                  value={form.prazo_execucao}
                  onChange={(e) => setForm((f) => ({ ...f, prazo_execucao: e.target.value }))}
                  className={inputCls}
                  placeholder="1"
                />
                <select
                  value={form.prazo_unidade}
                  onChange={(e) => setForm((f) => ({ ...f, prazo_unidade: e.target.value }))}
                  className={inputCls}
                  aria-label="Unidade do prazo"
                >
                  <option value="minutos">minutos</option>
                  <option value="horas">horas</option>
                  <option value="dias">dias</option>
                </select>
              </div>
            </div>
            <div className="col-span-6 sm:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Valor/Hora</span>
              <div className="px-2.5 py-2 bg-muted border border-border/40 rounded-lg text-xs font-bold font-mono text-foreground">{kz(valorHora)}</div>
            </div>
            <div className="col-span-6 sm:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Total</span>
              <div className="px-2.5 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs font-bold font-mono text-primary">{kz(total)}</div>
            </div>
            <div className="col-span-12 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Observações</span>
              <input
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                className={inputCls}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>Trabalhadores: <strong className="text-foreground">{Number(form.mob) || 1}</strong></span>
            <span>
              Duração: <strong className="text-foreground">{duracao}h</strong>{" "}
              ({Number(form.prazo_execucao) || 1} {unidadeLabel(form.prazo_execucao, form.prazo_unidade)})
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={fechar}>Cancelar</Button>
              <Button type="submit" size="sm" loading={guardando}>
                <Icon name="save" className="text-lg" /> {editando ? "Atualizar" : "Guardar"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {carregando ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">A carregar os serviços...</div>
      ) : (
        <>
          <LedgerTable>
            <thead>
              <tr className="border-b border-border">
                <LedgerTh>Serviço</LedgerTh>
                <LedgerTh className="text-right">Trabalhadores</LedgerTh>
                <LedgerTh>Duração</LedgerTh>
                <LedgerTh className="text-right">Valor/hora</LedgerTh>
                <LedgerTh className="text-right">Total</LedgerTh>
                <LedgerTh>Registado</LedgerTh>
                <LedgerTh className="w-10" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <LedgerTr key={r.id}>
                  <LedgerTd className="max-w-56">
                    <IdCell
                      id={r.servicoCatalogo?.nome || r.descricao || "—"}
                      meta={r.observacoes || (r.usuario?.nome ? `por ${r.usuario.nome}` : undefined)}
                    />
                  </LedgerTd>
                  <LedgerTd className="text-right text-xs font-medium text-foreground">{r.mob}</LedgerTd>
                  <LedgerTd>
                    <span className="text-xs text-foreground">{r.duracao_horas}h</span>{" "}
                    <span className="text-[11px] text-muted-foreground">
                      ({r.prazo_execucao} {unidadeLabel(r.prazo_execucao, r.prazo_unidade)})
                    </span>
                  </LedgerTd>
                  <LedgerTd className="text-right text-xs font-mono text-foreground">{kz(r.valor_hora)}</LedgerTd>
                  <LedgerTd className="text-right">
                    <StatusBadge tom="primary" className="font-mono">{kz(r.total)}</StatusBadge>
                  </LedgerTd>
                  <LedgerTd className="text-xs text-muted-foreground whitespace-nowrap">{dataCurta(r.createdAt)}</LedgerTd>
                  <LedgerTd>
                    {(podeEditar || podeEliminar) && (
                      <RowMenu
                        ariaLabel={`Ações do serviço ${r.descricao || r.id}`}
                        itens={[
                          ...(podeEditar ? [{ icone: "edit", rotulo: "Editar", onClick: () => abrirEdicao(r) }] : []),
                          ...(podeEliminar ? [{ icone: "delete", rotulo: "Remover", danger: true, onClick: () => setAEliminar(r) }] : []),
                        ]}
                      />
                    )}
                  </LedgerTd>
                </LedgerTr>
              ))}
            </tbody>
          </LedgerTable>
          {registros.length === 0 ? (
            <LedgerEmpty icone="construction">
              {podeCriar
                ? "Nenhum serviço registado. Use “Novo serviço” para somar trabalhadores, prazo e valor/hora."
                : "Nenhum serviço registado."}
            </LedgerEmpty>
          ) : (
            <Paginacao {...pag} label="serviços" />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(aEliminar)}
        onClose={() => setAEliminar(null)}
        onConfirm={confirmarEliminacao}
        loading={aEliminarOk}
        title="Remover registo de serviço"
        description={`Vai remover "${aEliminar?.servicoCatalogo?.nome || aEliminar?.descricao || "este serviço"}" do histórico da equipa.`}
      />
    </Ledger>
  );
}
