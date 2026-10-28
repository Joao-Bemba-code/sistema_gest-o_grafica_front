"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import KpiCard from "@/components/ui/KpiCard";
import { Ledger, LedgerHeader, LedgerTable, LedgerTh, LedgerTr, LedgerTd, StatusBadge, LedgerEmpty } from "@/components/ui/Ledger";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { exportarRelatorioExcel, exportarRelatorioPDF } from "@/lib/relatoriosExport";

// ───────────────────────── Classificadores aprovados ─────────────────────────
const TIPOS_CLIENTE = [
  "Pessoa singular", "Empresa privada", "Instituição pública", "ONG",
  "Associação/Fundação", "Organismo internacional", "Outro",
];
const CATEGORIAS = ["Estratégico", "Recorrente", "Regular", "Ocasional", "Potencial"];
const SETORES = [
  "Administração Pública", "Saúde", "Educação e Formação", "Comércio", "Indústria",
  "Construção", "Serviços Profissionais", "Tecnologia e Comunicação",
  "Agricultura e Ambiente", "Outros",
];
const FONTES_ORIGEM = [
  "Indicação", "Visita comercial", "Redes sociais", "Website", "Concurso público",
  "Contacto telefónico", "Parceria institucional", "Outros",
];
const PROVINCIAS = [
  "Luanda", "Benguela", "Huambo", "Huíla", "Namibe", "Cabinda", "Uíge", "Malanje",
  "Bié", "Moxico", "Cuando Cubango", "Cunene", "Lunda Norte", "Lunda Sul", "Zaire",
  "Bengo", "Cuanza Norte", "Cuanza Sul",
];
const UNIDADES = [
  "UN-01 Artes Gráficas",
  "UN-02 Formação Profissional",
  "UN-03 Soluções Digitais",
];

// Campos considerados essenciais para um cadastro estar completo.
const CAMPOS_ESSENCIAIS = [
  "nome", "nif", "telefone", "email", "tipo_cliente", "unidade_negocio",
  "categoria", "setor_atividade", "fonte_origem", "pessoa_contacto", "pessoa_telefone",
];
const ROTULO_CAMPO = {
  nome: "nome", nif: "NIF", telefone: "telefone", email: "e-mail",
  tipo_cliente: "tipo de cliente", unidade_negocio: "unidade", categoria: "categoria",
  setor_atividade: "sector", fonte_origem: "origem",
  pessoa_contacto: "pessoa de contacto", pessoa_telefone: "tel. da pessoa",
};

const ROTULOS_PERIODO = {
  tudo: "Todo o histórico",
  este_mes: "Este mês",
  mes_passado: "Mês passado",
  este_ano: "Este ano",
  personalizado: "Personalizado",
};

const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CORES = ["#0066CC", "#0ea5e9", "#14b8a6", "#f59e0b", "#a855f7", "#64748b", "#ef4444", "#84cc16"];
const COR_RELATORIO = "#0066CC";

const FILTROS_INICIAIS = {
  periodo: "tudo",
  dataInicial: "",
  dataFinal: "",
  unidade: "todas",
  associacao: "todas",
  estado: "todos",
  categoria: "todas",
  tipoCliente: "todos",
  setor: "todos",
  provincia: "todas",
  municipio: "todas",
  origem: "todas",
  qualidade: "todos",
};

const selectCls =
  "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

const preenchido = (v) => String(v ?? "").trim() !== "";

function dataRegisto(c) {
  const raw = c.dataCadastro || c.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function unidadesDoCliente(c) {
  const set = new Set();
  if (preenchido(c.unidade_negocio)) set.add(String(c.unidade_negocio).trim());
  if (Array.isArray(c.unidades_secundarias)) {
    c.unidades_secundarias.forEach((u) => { if (preenchido(u)) set.add(String(u).trim()); });
  }
  return set;
}

function camposEmFalta(c) {
  return CAMPOS_ESSENCIAIS.filter((k) => !preenchido(c[k]));
}

function cadastroCompleto(c) {
  return camposEmFalta(c).length === 0;
}

const ehMultiunidade = (c) => unidadesDoCliente(c).size >= 2;

// Funde a lista do classificador com os valores já registados nos cadastros.
function opcoesDe(listaBase, clientes, campo) {
  const mapa = new Map();
  const adicionar = (v) => {
    const t = String(v || "").trim();
    if (t) mapa.set(t.toLowerCase(), t);
  };
  listaBase.forEach(adicionar);
  clientes.forEach((c) => adicionar(c[campo]));
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt"));
}

function CampoFiltro({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CartaoGrafico({ icon, titulo, sub, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Icon name={icon} className="text-lg text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{titulo}</h3>
          {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CartaoDistribuicao({ icon, titulo, sub, dados, total }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Icon name={icon} className="text-lg text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{titulo}</h3>
          {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      <div className="max-h-64 space-y-2.5 overflow-y-auto p-4 pr-2">
        {dados.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">Sem dados para os filtros escolhidos.</p>
        ) : (
          dados.map((d, i) => {
            const pct = total ? Math.round((d.valor / total) * 100) : 0;
            return (
              <div key={d.nome}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{d.nome}</span>
                  <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-foreground">{d.valor} · {pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.valor / max) * 100}%`, background: CORES[i % CORES.length] }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function DicaTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Clientes registados: <span className="font-bold text-foreground">{payload[0].value}</span>
      </p>
    </div>
  );
}

export default function RelatorioClientes({ clientes = [], org = {} }) {
  const clientesBase = useMemo(() => clientes.filter((c) => c.tipo !== "fornecedor"), [clientes]);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);

  const mudar = (campo) => (e) => {
    const valor = e.target.value;
    setFiltros((f) => {
      const novo = { ...f, [campo]: valor };
      if (campo === "provincia") novo.municipio = "todas";
      return novo;
    });
  };

  const erroDatas =
    filtros.periodo === "personalizado" &&
    preenchido(filtros.dataInicial) &&
    preenchido(filtros.dataFinal) &&
    filtros.dataFinal < filtros.dataInicial;

  const faixa = useMemo(() => {
    const hoje = new Date();
    const fimDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    switch (filtros.periodo) {
      case "este_mes":
        return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim: fimDia(hoje) };
      case "mes_passado":
        return {
          inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1),
          fim: new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999),
        };
      case "este_ano":
        return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: fimDia(hoje) };
      case "personalizado": {
        if (erroDatas) return null;
        const ini = preenchido(filtros.dataInicial) ? new Date(`${filtros.dataInicial}T00:00:00`) : null;
        const fim = preenchido(filtros.dataFinal) ? new Date(`${filtros.dataFinal}T23:59:59`) : null;
        if (!ini && !fim) return null;
        return { inicio: ini, fim: fim };
      }
      default:
        return null;
    }
  }, [filtros.periodo, filtros.dataInicial, filtros.dataFinal, erroDatas]);

  const clientesFiltrados = useMemo(() => {
    const f = filtros;
    return clientesBase.filter((c) => {
      const dReg = dataRegisto(c);
      if (faixa) {
        if (!dReg) return false;
        if (faixa.inicio && dReg < faixa.inicio) return false;
        if (faixa.fim && dReg > faixa.fim) return false;
      }
      if (f.estado === "ativo" && c.ativo === false) return false;
      if (f.estado === "inactivo" && c.ativo !== false) return false;
      if (f.categoria !== "todas" && (c.categoria || "") !== f.categoria) return false;
      if (f.tipoCliente !== "todos" && (c.tipo_cliente || "") !== f.tipoCliente) return false;
      if (f.setor !== "todos" && (c.setor_atividade || "") !== f.setor) return false;
      if (f.provincia !== "todas" && (c.provincia || "") !== f.provincia) return false;
      if (f.municipio !== "todas" && (c.municipio || "") !== f.municipio) return false;
      if (f.origem !== "todas" && (c.fonte_origem || "") !== f.origem) return false;
      if (f.unidade !== "todas") {
        const principal = preenchido(c.unidade_negocio) && String(c.unidade_negocio).trim() === f.unidade;
        const secundaria = unidadesDoCliente(c).has(f.unidade) && !principal;
        if (f.associacao === "principal" && !principal) return false;
        if (f.associacao === "secundaria" && !secundaria) return false;
        if (f.associacao === "todas" && !principal && !secundaria) return false;
      }
      if (f.qualidade === "completos" && !cadastroCompleto(c)) return false;
      if (f.qualidade === "incompletos" && cadastroCompleto(c)) return false;
      return true;
    });
  }, [clientesBase, filtros, faixa]);

  // ── Indicadores ──
  const total = clientesFiltrados.length;
  const ativos = clientesFiltrados.filter((c) => c.ativo !== false);
  const inactivos = total - ativos.length;
  const taxaAtivos = total ? Math.round((ativos.length / total) * 100) : 0;
  const multiunidade = clientesFiltrados.filter(ehMultiunidade);
  const taxaMulti = total ? Math.round((multiunidade.length / total) * 100) : 0;
  const estrategicos = clientesFiltrados.filter((c) => (c.categoria || "") === "Estratégico");
  const completos = clientesFiltrados.filter(cadastroCompleto);
  const taxaCompletude = total ? Math.round((completos.length / total) * 100) : 0;
  const incompletos = clientesFiltrados.filter((c) => !cadastroCompleto(c));
  const semPessoa = clientesFiltrados.filter((c) => !preenchido(c.pessoa_contacto) && !preenchido(c.pessoa_telefone));

  // ── Distribuições ──
  const distribuicao = (campo) => {
    const m = new Map();
    clientesFiltrados.forEach((c) => {
      const v = String(c[campo] || "").trim() || "Não informado";
      m.set(v, (m.get(v) || 0) + 1);
    });
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([nome, valor]) => ({ nome, valor }));
  };
  const porTipo = distribuicao("tipo_cliente");
  const porCategoria = distribuicao("categoria");
  const porSetor = distribuicao("setor_atividade");
  const porProvincia = distribuicao("provincia");
  const porMunicipio = distribuicao("municipio");
  const porOrigem = distribuicao("fonte_origem");

  const porUnidade = UNIDADES.map((u) => ({
    nome: u,
    valor: ativos.filter((c) => unidadesDoCliente(c).has(u)).length,
  })).filter((x) => x.valor > 0);
  const semUnidade = ativos.filter((c) => unidadesDoCliente(c).size === 0).length;
  if (semUnidade > 0) porUnidade.push({ nome: "Sem unidade", valor: semUnidade });

  // ── Novos clientes por mês (gráfico) ──
  const novosPorMes = useMemo(() => {
    const hoje = new Date();
    const fimRef = faixa && faixa.fim
      ? new Date(faixa.fim.getFullYear(), faixa.fim.getMonth(), 1)
      : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioRef = faixa && faixa.inicio
      ? new Date(faixa.inicio.getFullYear(), faixa.inicio.getMonth(), 1)
      : new Date(fimRef.getFullYear(), fimRef.getMonth() - 5, 1);
    const meses = [];
    const cursor = new Date(inicioRef);
    while (cursor <= fimRef && meses.length < 12) {
      meses.push({ ano: cursor.getFullYear(), mes: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const contagem = new Map();
    clientesFiltrados.forEach((c) => {
      const d = dataRegisto(c);
      if (!d) return;
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    });
    return meses.map(({ ano, mes }) => ({
      label: mes === 0 ? `${nomesMeses[mes]} ${String(ano).slice(2)}` : nomesMeses[mes],
      valor: contagem.get(`${ano}-${String(mes + 1).padStart(2, "0")}`) || 0,
    }));
  }, [clientesFiltrados, faixa]);

  // ── Opções dos filtros ──
  const opcoesTipo = useMemo(() => opcoesDe(TIPOS_CLIENTE, clientesBase, "tipo_cliente"), [clientesBase]);
  const opcoesCategoria = useMemo(() => opcoesDe(CATEGORIAS, clientesBase, "categoria"), [clientesBase]);
  const opcoesSetor = useMemo(() => opcoesDe(SETORES, clientesBase, "setor_atividade"), [clientesBase]);
  const opcoesOrigem = useMemo(() => opcoesDe(FONTES_ORIGEM, clientesBase, "fonte_origem"), [clientesBase]);
  const opcoesProvincia = useMemo(() => opcoesDe(PROVINCIAS, clientesBase, "provincia"), [clientesBase]);
  const opcoesMunicipio = useMemo(() => {
    const base = filtros.provincia === "todas"
      ? clientesBase
      : clientesBase.filter((c) => (c.provincia || "") === filtros.provincia);
    return opcoesDe([], base, "municipio");
  }, [clientesBase, filtros.provincia]);

  const temFiltros =
    filtros.periodo !== "tudo" || filtros.unidade !== "todas" || filtros.estado !== "todos" ||
    filtros.categoria !== "todas" || filtros.tipoCliente !== "todos" || filtros.setor !== "todos" ||
    filtros.provincia !== "todas" || filtros.municipio !== "todas" || filtros.origem !== "todas" ||
    filtros.qualidade !== "todos";

  const limpar = () => setFiltros(FILTROS_INICIAIS);

  // ── Exportação ──
  const linhasExport = [
    ["Total de clientes", total],
    ["Clientes ativos", `${ativos.length} (${taxaAtivos}%)`],
    ["Clientes inactivos", inactivos],
    ["Novos no período", total],
    ["Clientes multiunidade", `${multiunidade.length} (${taxaMulti}%)`],
    ["Clientes estratégicos", estrategicos.length],
    ["Cadastros completos", `${completos.length} (${taxaCompletude}%)`],
    ["Cadastros incompletos", incompletos.length],
    ["Sem pessoa de contacto", semPessoa.length],
    ["", ""],
    ["Activos por unidade de negócio", ""],
    ...porUnidade.map((d) => [`  ${d.nome}`, d.valor]),
    ["", ""],
    ["Clientes por tipo", ""],
    ...porTipo.map((d) => [`  ${d.nome}`, d.valor]),
    ["", ""],
    ["Clientes por categoria", ""],
    ...porCategoria.map((d) => [`  ${d.nome}`, d.valor]),
    ["", ""],
    ["Clientes por sector", ""],
    ...porSetor.map((d) => [`  ${d.nome}`, d.valor]),
    ["", ""],
    ["Clientes por província", ""],
    ...porProvincia.map((d) => [`  ${d.nome}`, d.valor]),
    ["", ""],
    ["Clientes por município", ""],
    ...porMunicipio.map((d) => [`  ${d.nome}`, d.valor]),
    ["", ""],
    ["Clientes por fonte de origem", ""],
    ...porOrigem.map((d) => [`  ${d.nome}`, d.valor]),
  ];
  const exportarPdf = () =>
    exportarRelatorioPDF({
      titulo: "Relatório de Clientes",
      org,
      cabecalhos: ["Indicador", "Valor"],
      linhas: linhasExport,
      resumo: [
        `Período: ${ROTULOS_PERIODO[filtros.periodo]}${filtros.periodo === "personalizado" && faixa ? ` (${filtros.dataInicial || "—"} a ${filtros.dataFinal || "—"})` : ""}`,
        `Clientes considerados: ${total} de ${clientesBase.length}`,
      ],
    });
  const exportarExcel = () => exportarRelatorioExcel("Relatório de Clientes", ["Indicador", "Valor"], linhasExport);

  return (
    <section className="space-y-4">
      {/* ─────────── FILTROS ─────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
              <Icon name="filter_list" className="text-base text-muted-foreground" />
            </span>
            <p className="truncate text-sm font-semibold text-foreground">Relatório de Clientes</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={exportarPdf}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Icon name="picture_as_pdf" className="text-sm" /> Exportar PDF
            </button>
            <button
              type="button"
              onClick={exportarExcel}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Icon name="download" className="text-sm" /> Exportar Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CampoFiltro label="Período">
            <select value={filtros.periodo} onChange={mudar("periodo")} className={selectCls}>
              {Object.entries(ROTULOS_PERIODO).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </CampoFiltro>
          {filtros.periodo === "personalizado" && (
            <>
              <CampoFiltro label="Data inicial">
                <input
                  type="date"
                  value={filtros.dataInicial}
                  onChange={mudar("dataInicial")}
                  className={`${selectCls} ${erroDatas ? "border-destructive" : ""}`}
                />
              </CampoFiltro>
              <CampoFiltro label="Data final">
                <input
                  type="date"
                  value={filtros.dataFinal}
                  onChange={mudar("dataFinal")}
                  className={`${selectCls} ${erroDatas ? "border-destructive" : ""}`}
                />
              </CampoFiltro>
            </>
          )}
          <CampoFiltro label="Unidade de negócio">
            <select value={filtros.unidade} onChange={mudar("unidade")} className={selectCls}>
              <option value="todas">Todas</option>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </CampoFiltro>
          {filtros.unidade !== "todas" && (
            <CampoFiltro label="Tipo de associação à unidade">
              <select value={filtros.associacao} onChange={mudar("associacao")} className={selectCls}>
                <option value="todas">Todas (principal ou secundária)</option>
                <option value="principal">Principal</option>
                <option value="secundaria">Secundária</option>
              </select>
            </CampoFiltro>
          )}
          <CampoFiltro label="Estado">
            <select value={filtros.estado} onChange={mudar("estado")} className={selectCls}>
              <option value="todos">Todos</option>
              <option value="ativo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </CampoFiltro>
          <CampoFiltro label="Categoria">
            <select value={filtros.categoria} onChange={mudar("categoria")} className={selectCls}>
              <option value="todas">Todas</option>
              {opcoesCategoria.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Tipo de cliente">
            <select value={filtros.tipoCliente} onChange={mudar("tipoCliente")} className={selectCls}>
              <option value="todos">Todos</option>
              {opcoesTipo.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Sector de actividade">
            <select value={filtros.setor} onChange={mudar("setor")} className={selectCls}>
              <option value="todos">Todos</option>
              {opcoesSetor.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Província">
            <select value={filtros.provincia} onChange={mudar("provincia")} className={selectCls}>
              <option value="todas">Todas</option>
              {opcoesProvincia.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Município">
            <select value={filtros.municipio} onChange={mudar("municipio")} className={selectCls}>
              <option value="todas">Todos</option>
              {opcoesMunicipio.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Fonte de origem">
            <select value={filtros.origem} onChange={mudar("origem")} className={selectCls}>
              <option value="todas">Todas</option>
              {opcoesOrigem.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro label="Qualidade cadastral">
            <select value={filtros.qualidade} onChange={mudar("qualidade")} className={selectCls}>
              <option value="todos">Todos</option>
              <option value="completos">Completos</option>
              <option value="incompletos">Incompletos</option>
            </select>
          </CampoFiltro>
        </div>

        {erroDatas && (
          <p className="mt-2 text-[11px] font-medium text-destructive">
            A data inicial não pode ser posterior à data final.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            A mostrar <span className="font-medium text-foreground">{total}</span> de {clientesBase.length} clientes
            {filtros.unidade !== "todas" && (
              <> · Unidade {filtros.unidade} ({filtros.associacao === "todas" ? "principal ou secundária" : filtros.associacao})</>
            )}
          </p>
          {temFiltros && (
            <button
              type="button"
              onClick={limpar}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Icon name="close" className="text-sm text-primary" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ─────────── INDICADORES ─────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon="groups" label="Total de clientes" value={total} />
        <KpiCard icon="verified" label="Clientes ativos" value={ativos.length} badge={`Taxa de ativos: ${taxaAtivos}%`} iconVariant="success" />
        <KpiCard icon="block" label="Clientes inactivos" value={inactivos} iconVariant="secondary" />
        <KpiCard icon="today" label="Novos no período" value={total} badge={ROTULOS_PERIODO[filtros.periodo]} iconVariant="info" />
        <KpiCard icon="layers" label="Multiunidade" value={multiunidade.length} badge={`Taxa multiunidade: ${taxaMulti}%`} iconVariant="warning" />
        <KpiCard icon="check_circle" label="Estratégicos" value={estrategicos.length} />
        <KpiCard icon="task_alt" label="Cadastros completos" value={completos.length} badge={`Taxa de completude: ${taxaCompletude}%`} iconVariant="success" />
        <KpiCard icon="error" label="Cadastros incompletos" value={incompletos.length} iconVariant="error" />
        <KpiCard icon="person" label="Sem pessoa de contacto" value={semPessoa.length} iconVariant="secondary" />
      </div>

      {/* ─────────── NOVOS POR PERÍODO + UNIDADES ─────────── */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <CartaoGrafico icon="calendar_month" titulo="Novos clientes por período" sub="Clientes registados por mês">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={novosPorMes} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={4} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<DicaTooltip />} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="valor" name="Clientes registados" radius={[5, 5, 0, 0]} maxBarSize={42} fill={COR_RELATORIO} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CartaoGrafico>

        <CartaoDistribuicao
          icon="factory"
          titulo="Clientes ativos por unidade de negócio"
          sub="Contabiliza associações principal e secundárias"
          dados={porUnidade}
          total={ativos.length}
        />
      </div>

      {/* ─────────── DISTRIBUIÇÕES ─────────── */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CartaoDistribuicao icon="person" titulo="Clientes por tipo" dados={porTipo} total={total} />
        <CartaoDistribuicao icon="label" titulo="Clientes por categoria" dados={porCategoria} total={total} />
        <CartaoDistribuicao icon="factory" titulo="Clientes por sector" sub="Apresenta «Não informado» quando necessário" dados={porSetor} total={total} />
        <CartaoDistribuicao icon="pin_drop" titulo="Clientes por província" dados={porProvincia} total={total} />
        <CartaoDistribuicao icon="pin_drop" titulo="Clientes por município" dados={porMunicipio} total={total} />
        <CartaoDistribuicao icon="handshake" titulo="Clientes por fonte de origem" dados={porOrigem} total={total} />
      </div>

      {/* ─────────── QUALIDADE CADASTRAL ─────────── */}
      <Ledger rotulo="Qualidade cadastral ledger">
        <LedgerHeader
          titulo="Cadastros incompletos"
          subtitulo={`${incompletos.length} cadastros com campos essenciais em falta · Essenciais: nome, NIF, telefone, e-mail, tipo de cliente, unidade, categoria, sector, origem, pessoa de contacto e telefone da pessoa`}
        />
        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh>Cliente</LedgerTh>
              <LedgerTh>NIF</LedgerTh>
              <LedgerTh>Campos em falta</LedgerTh>
              <LedgerTh>Pessoa de contacto</LedgerTh>
            </tr>
          </thead>
          <tbody>
            {incompletos.map((c) => {
              const falta = camposEmFalta(c);
              const semP = !preenchido(c.pessoa_contacto) && !preenchido(c.pessoa_telefone);
              return (
                <LedgerTr key={c.id ?? c.codigo}>
                  <LedgerTd className="font-medium">{c.nome || "—"}</LedgerTd>
                  <LedgerTd className="whitespace-nowrap font-mono text-xs text-muted-foreground">{c.nif || "—"}</LedgerTd>
                  <LedgerTd className="text-xs text-muted-foreground">
                    {falta.length} — {falta.slice(0, 4).map((k) => ROTULO_CAMPO[k]).join(", ")}
                    {falta.length > 4 ? "…" : ""}
                  </LedgerTd>
                  <LedgerTd>
                    {semP ? (
                      <StatusBadge tom="warning">Sem pessoa de contacto</StatusBadge>
                    ) : (
                      <StatusBadge tom="success">OK</StatusBadge>
                    )}
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {incompletos.length === 0 && (
          <LedgerEmpty icone="task_alt">Todos os cadastros estão completos</LedgerEmpty>
        )}
      </Ledger>
    </section>
  );
}
