"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";

const convVazio = {
  largura: "1000",
  altura: "700",
  alvo_largura: "210",
  alvo_altura: "297",
  margem: "5",
  gramagem: "90",
  quantidade: "",
};

const FORMATOS_A = {
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
};

function formatoANome(largura, altura) {
  for (const [nome, [l, a]] of Object.entries(FORMATOS_A)) {
    if (
      (Math.round(largura) === l && Math.round(altura) === a) ||
      (Math.round(largura) === a && Math.round(altura) === l)
    ) {
      return nome;
    }
  }
  return null;
}

function calcularMatriz(largura, altura, alvoLargura, alvoAltura, margem, gramagem, quantidade) {
  const l = Math.max(0, Number(largura) - 2 * Number(margem));
  const a = Math.max(0, Number(altura) - 2 * Number(margem));
  const al = Number(alvoLargura);
  const aa = Number(alvoAltura);
  if (!(l > 0) || !(a > 0) || !(al > 0) || !(aa > 0)) return null;

  const semRotacao = Math.floor(l / al) * Math.floor(a / aa);
  const comRotacao = Math.floor(l / aa) * Math.floor(a / al);
  const rotacionada = comRotacao > semRotacao;
  const pecas = rotacionada ? comRotacao : semRotacao;

  const areaFolha = (l * a) / 1_000_000;
  const areaAlvo = (al * aa) / 1_000_000;
  const utilizada = pecas * areaAlvo;
  const desperdicio = areaFolha > 0 ? Math.max(0, (1 - utilizada / areaFolha) * 100) : 100;

  const folhasNecessarias = Number(quantidade) > 0 && pecas > 0 ? Math.ceil(Number(quantidade) / pecas) : 0;

  const baseFolhas = folhasNecessarias > 0 ? folhasNecessarias : 1000;
  const pesoKg = (gramagem / 1000) * areaFolha * baseFolhas;

  return {
    folha: { largura: l, altura: a },
    larguraBruta: Number(largura),
    alturaBruta: Number(altura),
    margem: Number(margem),
    gramagem: Number(gramagem),
    pecas_por_folha: pecas,
    orientacao: rotacionada ? "rotacionada" : "normal",
    folhas_necessarias: folhasNecessarias,
    quantidade: Number(quantidade) || 0,
    desperdicio_percent: desperdicio,
    peso_kg: pesoKg,
    alvo: { largura: al, altura: aa },
    colunas: rotacionada ? Math.floor(l / aa) : Math.floor(l / al),
    linhas: rotacionada ? Math.floor(a / al) : Math.floor(a / aa),
  };
}

function Campo({ label, valor, onChange, hint }) {
  return (
    <div className="input-glow bg-surface-variant/30 rounded-lg p-3 border-b-2 border-outline/30 transition-all duration-300">
      <label className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal text-[9px] opacity-70">{hint}</span>}
      </label>
      <NumeroInput
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-on-surface font-mono text-lg focus:outline-none focus:ring-0 border-none p-0"
      />
    </div>
  );
}

export default function ConversorModal({ open, onClose, formatos, onCalcular }) {
  const [form, setForm] = useState(convVazio);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [calculando, setCalculando] = useState(false);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const processar = async (e) => {
    e.preventDefault();
    setErro("");
    const local = calcularMatriz(
      form.largura,
      form.altura,
      form.alvo_largura,
      form.alvo_altura,
      form.margem,
      form.gramagem,
      form.quantidade
    );
    if (!local) {
      setErro("Verifique as dimensões da folha e dos cortes");
      return;
    }

    setCalculando(true);
    const alvoNome = formatoANome(Number(form.alvo_largura), Number(form.alvo_altura));
    let api = null;
    if (alvoNome && onCalcular) {
      api = await onCalcular({
        formato: undefined,
        largura: Number(form.largura) / 10,
        altura: Number(form.altura) / 10,
        formato_alvo: alvoNome,
        quantidade: form.quantidade || undefined,
      });
    }
    setCalculando(false);

    if (api && api.pecas_por_folha > 0) {
      const orient = api.orientacao === "rotacionada";
      setResultado({
        ...local,
        pecas_por_folha: api.pecas_por_folha,
        orientacao: api.orientacao,
        folhas_necessarias: api.folhas_necessarias || local.folhas_necessarias,
        colunas: orient ? Math.floor(local.folha.largura / local.alvo.altura) : Math.floor(local.folha.largura / local.alvo.largura),
        linhas: orient ? Math.floor(local.folha.altura / local.alvo.largura) : Math.floor(local.folha.altura / local.alvo.altura),
      });
    } else {
      setResultado(local);
    }
  };

  const diagrama = useMemo(() => {
    if (!resultado || resultado.pecas_por_folha <= 0) return null;
    const cells = [];
    for (let c = 0; c < resultado.colunas; c++) {
      for (let r = 0; r < resultado.linhas; r++) {
        cells.push(`${c}-${r}`);
      }
    }
    return cells;
  }, [resultado]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conversor de Formatos"
      icon="calculate"
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="bg-surface-variant text-on-surface border border-outline-variant px-4 py-2 rounded font-mono flex items-center gap-2 hover:border-primary hover:text-primary transition-all text-[11px] uppercase tracking-wider"
          >
            Fechar
          </button>
          <button
            type="submit"
            form="form-conversor"
            disabled={calculando}
            className="bg-primary text-on-primary hover:bg-primary-fixed transition-colors py-2 px-4 rounded font-mono text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {calculando ? (
              <>
                <span className="spinner" aria-hidden="true" /> A processar...
              </>
            ) : (
              <>
                <Icon name="calculate" className="text-base" /> Processar Matriz
              </>
            )}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Painel de inputs */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
          <h3 className="font-mono text-sm text-primary mb-5 flex items-center gap-2 uppercase tracking-widest">
            <Icon name="tune" className="text-base" /> Parâmetros de Corte
          </h3>
          <form id="form-conversor" onSubmit={processar} className="space-y-5">
            <div className="space-y-3">
              <h4 className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-white/10 pb-2">
                Formato de Entrada
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Largura" hint="(mm)" valor={form.largura} onChange={set("largura")} />
                <Campo label="Altura" hint="(mm)" valor={form.altura} onChange={set("altura")} />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-white/10 pb-2">
                Cortes Pretendidos
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Largura" hint="(mm)" valor={form.alvo_largura} onChange={set("alvo_largura")} />
                <Campo label="Altura" hint="(mm)" valor={form.alvo_altura} onChange={set("alvo_altura")} />
              </div>
              {formatos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formatos.filter((f) => f.largura && f.altura).slice(0, 8).map((f) => (
                    <button
                      key={f.nome}
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, alvo_largura: String(f.largura * 10), alvo_altura: String(f.altura * 10) }))}
                      className="px-2 py-1 rounded bg-surface-variant border border-outline-variant text-[9px] font-mono text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                    >
                      {f.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Margem" hint="(mm)" valor={form.margem} onChange={set("margem")} />
              <Campo label="Gramagem" hint="(g/m²)" valor={form.gramagem} onChange={set("gramagem")} />
            </div>

            <div>
              <Campo label="Quantidade" hint="(opcional)" valor={form.quantidade} onChange={set("quantidade")} />
            </div>

            {erro && (
              <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-error bg-error/10 rounded-lg px-3 py-2.5">
                <Icon name="error" className="text-base" /> {erro}
              </p>
            )}
          </form>
        </div>

        {/* Diagrama */}
        <div className="lg:col-span-5 glass-panel rounded-xl p-6 flex flex-col min-h-[420px]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-mono text-sm text-on-surface flex items-center gap-2 uppercase tracking-widest">
              <Icon name="grid_view" className="text-base text-secondary" /> Aproveitamento
            </h3>
            <div className="px-3 py-1 bg-surface-variant/50 rounded-full font-mono text-[10px] text-on-surface-variant border border-white/5">
              {resultado ? "Escala Otimizada" : "Aguarda Processamento"}
            </div>
          </div>
          <div className="flex-1 bg-surface-container-lowest/50 rounded-lg border border-outline-variant/30 relative diagram-bg p-4 flex items-center justify-center overflow-hidden shadow-inner">
            {!resultado && (
              <p className="text-on-surface-variant font-mono text-xs text-center">
                Defina os parâmetros e processe a matriz
              </p>
            )}
            {resultado && (
              <div
                className="relative border-2 border-dashed border-outline/50 flex flex-wrap content-start items-start gap-1 p-1"
                style={{
                  width: "88%",
                  aspectRatio: `${resultado.folha.largura} / ${resultado.folha.altura}`,
                  maxHeight: "85%",
                }}
              >
                {(diagrama || []).map((cell, i) => (
                  <div
                    key={cell}
                    className="bg-primary/10 border border-primary/50 rounded-sm flex items-center justify-center"
                    style={{
                      width: `${100 / resultado.colunas}%`,
                      height: `${100 / resultado.linhas}%`,
                    }}
                  >
                    <span className="text-[8px] font-mono text-primary/60">{i + 1}</span>
                  </div>
                ))}
                {/* Waste areas */}
                <div className="absolute bottom-0 right-0 w-[6%] h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,180,171,0.1)_5px,rgba(255,180,171,0.1)_10px)] border border-error/20" />
                <div className="absolute bottom-0 left-0 w-full h-[6%] bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,180,171,0.1)_5px,rgba(255,180,171,0.1)_10px)] border border-error/20" />
              </div>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass-panel rounded-xl p-5 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
              <Icon name="layers" className="text-primary text-sm" /> Total de Folhas
            </p>
            <p className="font-mono text-3xl font-bold text-on-surface">
              {resultado ? resultado.pecas_por_folha : "—"}
              <span className="text-sm text-outline ml-1">un</span>
            </p>
            <div className="mt-4 h-1 w-full bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: resultado ? `${Math.min(100, (resultado.pecas_por_folha / Math.max(1, resultado.colunas * resultado.linhas)) * 100)}%` : "0%" }}
              />
            </div>
          </div>

          <div className="glass-panel rounded-xl p-5 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/10 rounded-full blur-2xl group-hover:bg-error/20 transition-colors" />
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
              <Icon name="delete_sweep" className="text-error text-sm" /> Desperdício
            </p>
            <p className="font-mono text-3xl font-bold text-error">
              {resultado ? resultado.desperdicio_percent.toFixed(1) : "—"}
              <span className="text-sm text-error/60 ml-1">%</span>
            </p>
            <p className="font-mono text-[10px] text-on-surface-variant mt-2">
              {resultado ? `Orientação: ${resultado.orientacao === "rotacionada" ? "rotacionada (90°)" : "normal"}` : "Área não utilizável por folha matriz"}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-5 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-colors" />
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
              <Icon name="weight" className="text-secondary text-sm" /> Peso Total
            </p>
            <p className="font-mono text-3xl font-bold text-on-surface">
              {resultado ? resultado.peso_kg.toFixed(1) : "—"}
              <span className="text-sm text-outline ml-1">kg</span>
            </p>
            <p className="font-mono text-[10px] text-on-surface-variant mt-2">
              {resultado
                ? resultado.folhas_necessarias > 0
                  ? `Para ${resultado.quantidade.toLocaleString("pt-AO")} peças (${resultado.folhas_necessarias} folhas)`
                  : "Estimativa para 1000 folhas base"
                : "Estimativa do peso em papel"}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
