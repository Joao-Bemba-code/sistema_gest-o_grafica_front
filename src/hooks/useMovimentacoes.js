"use client";

import { useState, useCallback, useMemo } from "react";
import { extrato } from "@/services/materiais";
import { listar as listarRequisicoes } from "@/services/requisicoesMaterial";
import { gerarRequisicaoPDF } from "@/lib/estoquePdf";
import { useToast } from "@/components/Toast";

export default function useMovimentacoes({ org }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(10);
  const [movimentos, setMovimentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [pdfId, setPdfId] = useState(null);

  const abrir = useCallback(async () => {
    setOpen(true);
    setFiltro("todos");
    setBusca("");
    setLimite(10);
    setCarregando(true);
    try {
      const e = await extrato();
      setMovimentos(Array.isArray(e) ? e : []);
    } catch {
      addToast("Erro ao carregar movimentações", "error");
      setMovimentos([]);
    } finally {
      setCarregando(false);
    }
  }, [addToast]);

  const fechar = useCallback(() => setOpen(false), []);

  // A ficha de saída imprime quem preparou, quem entregou e quem recebeu. Essa
  // informação vive na requisição (o movimento só guarda a referência), por isso
  // vamos buscá-la pelo id quando o movimento vem de uma requisição de material.
  const requisicaoDoMovimento = useCallback(async (mov) => {
    if (mov?.referencia_tipo !== "requisicao_material" || !mov?.referencia_id) return null;
    try {
      const todas = await listarRequisicoes();
      return (Array.isArray(todas) ? todas : []).find((r) => Number(r.id) === Number(mov.referencia_id)) || null;
    } catch {
      return null;
    }
  }, []);

  const gerarPDF = useCallback(async (mov) => {
    setPdfId(mov.id);
    try {
      const requisicao = await requisicaoDoMovimento(mov);
      await gerarRequisicaoPDF(mov, org || {}, requisicao);
    } catch {
      addToast("Erro ao gerar PDF", "error");
    } finally {
      setPdfId(null);
    }
  }, [org, addToast, requisicaoDoMovimento]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return movimentos
      .filter((m) => filtro === "todos" || m.tipo === filtro)
      .filter((m) => {
        if (!q) return true;
        const alvo = `${m.material?.nome || ""} ${m.fornecedor_nome || ""} ${m.cliente_nome || ""} ${m.lote || ""} ${m.solicitado_por || ""}`.toLowerCase();
        return alvo.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [movimentos, filtro, busca]);

  const visiveis = filtrados.slice(0, limite);
  const temMais = visiveis.length < filtrados.length;
  const carregarMais = useCallback(() => setLimite((l) => l + 10), []);

  return {
    open, abrir, fechar, filtro, setFiltro, busca, setBusca,
    movimentos, filtrados, visiveis, temMais, carregarMais,
    carregando, gerarPDF, pdfId,
  };
}
