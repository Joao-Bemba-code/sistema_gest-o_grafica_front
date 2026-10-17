"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import Icon from "@/components/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Modal from "@/components/Modal";
import RowMenu from "@/components/ui/RowMenu";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerHeader,
  FilterRow,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import MaquinaModal from "@/components/maquinas/MaquinaModal";
import RegistarEstadoModal from "@/components/maquinas/RegistarEstadoMaquinaModal";
import { listar, remover } from "@/services/maquinas";
import { listarOrdens } from "@/services/producao";
import { buscarOrganizacao } from "@/services/configuracoes";
import { estadoMaquinaCfg, toNumMaq } from "@/lib/maquinas";
import gerarRelatorioMaquinas from "@/lib/machinesPdf";

function fmtData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const estadoTom = (e) =>
  e === "operacional" ? "success" : e === "manutencao" ? "warning" : e === "avariada" ? "error" : "neutral";

const estadoIcone = (e) =>
  e === "operacional" ? "check_circle" : e === "manutencao" ? "handyman" : e === "avariada" ? "error" : "block";

const estadoCor = (e) =>
  e === "operacional" ? "bg-success/15 text-success" : e === "manutencao" ? "bg-warning/15 text-warning" : e === "avariada" ? "bg-error/15 text-error" : "bg-muted/50 text-muted-foreground";

const ehStock = (m) => m?.origem === "stock";

function LinhaTempo({ itens, vazio }) {
  if (!itens || itens.length === 0) {
    return <p className="text-[11px] text-muted-foreground">{vazio || "Sem registos."}</p>;
  }
  return (
    <div className="relative pl-7">
      <span className="absolute left-[9px] top-1 bottom-1 w-px bg-border/40" aria-hidden="true" />
      <div className="space-y-4">
        {itens.map((it, i) => (
          <div key={i} className="relative">
            <span className={`absolute -left-7 top-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ${it.cor || "bg-primary/15 text-primary"}`}>
              <Icon name={it.icon} className="text-[11px]" />
            </span>
            <div className="text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-bold text-foreground">{it.titulo}</p>
                {it.data && it.data !== "—" && <span className="font-mono text-[10px] text-muted-foreground">{it.data}</span>}
              </div>
              {it.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{it.sub}</p>}
              {it.detalhes && it.detalhes.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                  {it.detalhes.map((d, j) => (
                    <span key={j}>{d}</span>
                  ))}
                </div>
              )}
              {it.obs && <p className="text-[11px] text-muted-foreground italic mt-0.5">{it.obs}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoLinha({ icon, cor, titulo }) {
  return (
    <p className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-muted-foreground">
      <span className={`w-5 h-5 rounded-md flex items-center justify-center ${cor || "bg-primary/10 text-primary"}`}>
        <Icon name={icon} className="text-[12px]" />
      </span>
      {titulo}
    </p>
  );
}

function HistoricoMaquina({ maquina, ordens }) {
  const estados = Array.isArray(maquina.historico_estados) ? maquina.historico_estados.slice().reverse() : [];
  const manutencoes = Array.isArray(maquina.manutencoes) ? maquina.manutencoes.slice().reverse() : [];
  const alvos = [maquina.nome_comum, maquina.codigo]
    .map((x) => String(x || "").trim().toLowerCase())
    .filter(Boolean);

  const uso = [];
  (Array.isArray(ordens) ? ordens : []).forEach((o) => {
    const regs = Array.isArray(o.impressaos) ? o.impressaos : o.impressaos ? [o.impressaos] : [];
    regs.forEach((r) => {
      if (r && alvos.includes(String(r.maquina || "").trim().toLowerCase())) uso.push({ op: o, reg: r });
    });
  });

  const itensEstados = estados.map((e) => ({
    icon: estadoIcone(e.estado),
    cor: estadoCor(e.estado),
    titulo: estadoMaquinaCfg[e.estado]?.label || e.estado || "Estado",
    data: fmtData(e.data),
    obs: e.motivo ? `Motivo: ${e.motivo}` : "",
    detalhes: [
      e.tempo_estimado ? `Tempo previsto: ${e.tempo_estimado}` : "",
      e.tecnico ? `Técnico: ${e.tecnico}` : "",
    ].filter(Boolean),
  }));

  const itensManut = manutencoes.map((x) => ({
    icon: "handyman",
    cor: "bg-warning/15 text-warning",
    titulo: x.intervencao || x.descricao || "Manutenção",
    data: fmtData(x.data || x.data_manutencao),
    sub: [x.tecnico ? `Técnico: ${x.tecnico}` : "", x.tipo ? `Tipo: ${x.tipo}` : ""].filter(Boolean).join(" · "),
    detalhes: [
      x.tempo_paragem != null && x.tempo_paragem !== "" ? `Paragem: ${x.tempo_paragem} h` : "",
      x.pecas ? `Peças: ${x.pecas}` : "",
      x.custo ? `Custo: ${x.custo}` : "",
    ].filter(Boolean),
  }));

  const itensUso = uso.map((u) => ({
    icon: "print",
    cor: "bg-primary/15 text-primary",
    titulo: `OP ${u.op.numero || u.op.id}`,
    data: fmtData(u.reg.data_inicio || u.reg.inicio || u.reg.horaInicio || u.reg.data || ""),
    sub: u.op.cliente?.nome || u.op.cliente || "",
    detalhes: [
      `Operador: ${u.reg.operador || "—"}`,
      u.reg.quantidade_produzida != null && u.reg.quantidade_produzida !== ""
        ? `Produzido: ${u.reg.quantidade_produzida}`
        : "",
      u.reg.quantidade_rejeitada != null && u.reg.quantidade_rejeitada !== ""
        ? `Rejeitado: ${u.reg.quantidade_rejeitada}`
        : "",
    ].filter(Boolean),
    obs: u.reg.observacoes || "",
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <SecaoLinha icon="history_edu" cor="bg-primary/15 text-primary" titulo="Mudanças de estado" />
        <LinhaTempo itens={itensEstados} vazio="Sem mudanças de estado registadas." />
      </div>
      <div>
        <SecaoLinha icon="handyman" cor="bg-warning/15 text-warning" titulo="Manutenções" />
        <LinhaTempo itens={itensManut} vazio="Sem manutenções registadas." />
      </div>
      <div>
        <SecaoLinha icon="print" cor="bg-primary/15 text-primary" titulo="Uso em produção" />
        <LinhaTempo itens={itensUso} vazio="Sem utilização em ordens de produção." />
      </div>
    </div>
  );
}

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (m) => [m.nome_comum, m.nome_tecnico, m.codigo, m.marca, m.modelo, m.numero_patrimonial, m.localizacao].join(" ") },
  { value: "nome", label: "Nome", obter: (m) => `${m.nome_comum || ""} ${m.nome_tecnico || ""}` },
  { value: "codigo", label: "Código", obter: (m) => m.codigo || "" },
  { value: "marca", label: "Marca / modelo", obter: (m) => `${m.marca || ""} ${m.modelo || ""}` },
  { value: "localizacao", label: "Localização", obter: (m) => m.localizacao || "" },
];

const ESTADOS_FILTRO = ["todos", "operacional", "manutencao", "avariada", "desativada"];

const pillBase = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors";
const pillAtiva = "border-primary/40 bg-primary/10 text-primary";
const pillInativa = "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground";

export default function MaquinasTab({ showHeader = false, registarEstado = false }) {
  const { addToast } = useToast();
  const [maquinas, setMaquinas] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [formMaq, setFormMaq] = useState({ aberto: false, id: null });
  const [historicoMaq, setHistoricoMaq] = useState(null);
  const [estadoModal, setEstadoModal] = useState({ aberto: false, id: null });
  const [empresa, setEmpresa] = useState({});
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [data, ordensData, org] = await Promise.all([listar(), listarOrdens(), buscarOrganizacao().catch(() => null)]);
      setMaquinas(Array.isArray(data) ? data : data?.data ?? []);
      setOrdens(Array.isArray(ordensData) ? ordensData : ordensData?.ordens || []);
      setEmpresa(org || {});
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar maquinaria", "error");
      setMaquinas([]);
      setOrdens([]);
    } finally { setCarregando(false); }
  }, [addToast]);

  useEffect(() => {
    const t = setTimeout(() => carregar(), 0);
    return () => clearTimeout(t);
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...maquinas];
    if (filtroEstado !== "todos") res = res.filter((m) => m.estado === filtroEstado);
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((m) => {
        const alvo = String(cfg.obter(m) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave === "nome") res.sort((a, b) => String(a.nome_comum || "").localeCompare(String(b.nome_comum || ""), "pt") * ordem.dir);
    if (ordem.chave === "codigo") res.sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt") * ordem.dir);
    return res;
  }, [maquinas, filtro, filtroEstado, ordem]);

  const contagensEstado = useMemo(() => {
    const c = { todos: maquinas.length };
    for (const e of ESTADOS_FILTRO) {
      if (e !== "todos") c[e] = maquinas.filter((m) => m.estado === e).length;
    }
    return c;
  }, [maquinas]);

  const { visiveis, ...pag } = usePaginacao({ items: filtrados });

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await remover(eliminarItem.id);
      addToast("Máquina removida com sucesso", "success");
      await carregar();
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally { setDeletando(false); }
  };

  const totalOperacionais = maquinas.filter((m) => m.estado === "operacional").length;
  const totalManutencao = maquinas.filter((m) => m.estado === "manutencao" || m.estado === "avariada").length;

  const abrirNova = () => setFormMaq({ aberto: true, id: null });
  const abrirEstadoModal = (m) => setEstadoModal({ aberto: true, id: m ? m.id : null });

  const maqHistorico = historicoMaq ? maquinas.find((m) => m.id === historicoMaq) || null : null;

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-normal tracking-tight text-foreground">Maquinária</h1>
            <p className="mt-1 text-xs text-muted-foreground">Gestão de máquinas e equipamentos · {maquinas.length} máquinas</p>
          </div>
        </div>
      )}

      <Ledger rotulo="Máquinas ledger">
        <LedgerHeader
          titulo={registarEstado ? "Estado das máquinas" : "Máquinas"}
          subtitulo={`${maquinas.length} máquinas · ${totalOperacionais} operacionais · ${totalManutencao} em manutenção/avaria`}
          novo={registarEstado ? "Registar estado" : "Nova máquina"}
          aoNovo={registarEstado ? () => abrirEstadoModal(null) : abrirNova}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        {filtrosAbertos && (
          <FilterRow
            campo={filtro.campo}
            setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
            campos={CAMPOS.map(({ value, label }) => ({ value, label }))}
            operador={filtro.operador}
            setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
            termo={filtro.termo}
            setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
            aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
            placeholder="Pesquisar por nome, código, marca, modelo..."
          />
        )}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          {ESTADOS_FILTRO.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setFiltroEstado(e)}
              aria-pressed={filtroEstado === e}
              className={`${pillBase} ${filtroEstado === e ? pillAtiva : pillInativa}`}
            >
              {e === "todos" ? "Todos" : estadoMaquinaCfg[e]?.label || e}
              <span className="text-[11px] text-muted-foreground">{contagensEstado[e] ?? 0}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => gerarRelatorioMaquinas(filtrados, ordens, empresa)}
            className={`${pillBase} ${pillInativa} ml-auto`}
          >
            <Icon name="picture_as_pdf" className="text-sm" /> Relatório em PDF
          </button>
        </div>

        {carregando && maquinas.length === 0 ? (
          <div className="p-4"><CardSkeleton lines={5} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "nome" ? { chave: "nome", dir: -p.dir } : { chave: "nome", dir: 1 }))} ativo={ordem.chave === "nome"}>Máquina</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "codigo" ? { chave: "codigo", dir: -p.dir } : { chave: "codigo", dir: 1 }))} ativo={ordem.chave === "codigo"}>Código</LedgerTh>
                  <LedgerTh>Marca / Modelo</LedgerTh>
                  <LedgerTh>Estado</LedgerTh>
                  <LedgerTh>Capacidade</LedgerTh>
                  <LedgerTh>Localização</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((m) => (
                  <LedgerTr key={m.id} onClick={() => setHistoricoMaq(m.id)}>
                    <LedgerTd className="max-w-52">
                      <IdCell id={m.nome_comum} meta={m.nome_tecnico || "—"} aoAbrir={() => setHistoricoMaq(m.id)} />
                    </LedgerTd>
                    <LedgerTd className="font-mono text-xs text-muted-foreground">{m.codigo || "—"}</LedgerTd>
                    <LedgerTd className="max-w-40"><span className="block truncate text-muted-foreground">{[m.marca, m.modelo].filter(Boolean).join(" ") || "—"}</span></LedgerTd>
                    <LedgerTd>
                      <span className="flex flex-wrap items-center gap-1">
                        <StatusBadge tom={estadoTom(m.estado)}>{estadoMaquinaCfg[m.estado]?.label || m.estado || "—"}</StatusBadge>
                        {ehStock(m) && <StatusBadge tom="neutral">Stock</StatusBadge>}
                      </span>
                    </LedgerTd>
                    <LedgerTd className="text-muted-foreground whitespace-nowrap">{toNumMaq(m.capacidade_nominal) ? `${Number(m.capacidade_nominal).toLocaleString("pt-AO")} un/h` : "—"}</LedgerTd>
                    <LedgerTd className="text-muted-foreground">{m.localizacao || "—"}</LedgerTd>
                    <LedgerTd>
                      <RowMenu
                        ariaLabel="Ações da máquina"
                        itens={[
                          { icone: "history", rotulo: "Histórico", onClick: () => setHistoricoMaq(m.id) },
                          ...(registarEstado ? [{ icone: "swap_horiz", rotulo: "Registar estado", onClick: () => abrirEstadoModal(m) }] : []),
                          ...(!ehStock(m) ? [
                            { icone: "delete", rotulo: "Remover", danger: true, onClick: () => setEliminarItem(m) },
                          ] : []),
                        ]}
                      />
                    </LedgerTd>
                  </LedgerTr>
                ))}
              </tbody>
            </LedgerTable>
            {pag.total === 0 && (
              <LedgerEmpty icone="precision_manufacturing">
                {maquinas.length === 0 && !registarEstado ? "Nenhuma máquina registada" : "Nenhuma máquina corresponde ao filtro"}
              </LedgerEmpty>
            )}
            <Paginacao {...pag} label="máquinas" />
          </>
        )}
      </Ledger>

      <Modal
        open={Boolean(maqHistorico)}
        onClose={() => setHistoricoMaq(null)}
        title={`${maqHistorico?.nome_comum || ""} — Histórico`}
        icon="history"
        size="xl"
      >
        {maqHistorico && <HistoricoMaquina maquina={maqHistorico} ordens={ordens} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Eliminar máquina"
        description={eliminarItem ? `Tem a certeza que deseja eliminar "${eliminarItem.nome_comum}"? Esta ação não pode ser desfeita.` : ""}
      />

      <MaquinaModal
        key={formMaq.id ?? "novo"}
        open={formMaq.aberto}
        maquinaId={formMaq.id}
        onClose={() => setFormMaq({ aberto: false, id: null })}
        onSaved={() => {
          setFormMaq({ aberto: false, id: null });
          carregar();
        }}
      />

      {registarEstado && (
        <RegistarEstadoModal
          key={estadoModal.id ?? "estado"}
          open={estadoModal.aberto}
          maquinas={maquinas}
          maquinaInicialId={estadoModal.id}
          onClose={() => setEstadoModal({ aberto: false, id: null })}
          onSaved={() => {
            setEstadoModal({ aberto: false, id: null });
            carregar();
          }}
        />
      )}
    </div>
  );
}
