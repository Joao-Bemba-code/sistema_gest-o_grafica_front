"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  listar,
  criar,
  atualizar,
  movimentar,
  converter,
  listarReservas,
  cancelarReserva,
  listarFormatos,
} from "@/services/materiais";
import { listar as listarCategorias } from "@/services/categorias";
import { listar as listarFornecedores } from "@/services/fornecedores";
import { listar as listarClientes } from "@/services/clientes";
import { buscarOrganizacao } from "@/services/configuracoes";
import { getUsuario } from "@/services/auth";
import { useToast } from "@/components/Toast";
import { statusDe, toNum } from "@/lib/estoque";

const camposNumericos = [
  "gramagem", "largura", "altura", "percentual_quebra",
  "estoque_min", "estoque_max", "ponto_ressuprimento", "custo_unit", "margem", "lucro",
];

export default function useEstoque() {
  const { addToast } = useToast();
  const [materiais, setMateriais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [org, setOrg] = useState({});
  const [formatos, setFormatos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const nomeUsuario = useMemo(() => getUsuario()?.nome || "", []);

  const carregar = useCallback(async (tentativa = 0) => {
    setCarregando(true);
    const resultados = await Promise.allSettled([
      listar(),
      listarCategorias(),
      listarFornecedores(),
      listarClientes({ tipo: "cliente" }),
      listarFormatos(),
      buscarOrganizacao(),
    ]);
    const [m, c, f, cl, fm, o] = resultados;
    if (m.status === "rejected" && tentativa === 0) {
      return carregar(1);
    }
    setMateriais(m.status === "fulfilled" && Array.isArray(m.value) ? m.value : []);
    setCategorias(c.status === "fulfilled" && Array.isArray(c.value) ? c.value : []);
    setFornecedores(f.status === "fulfilled" && Array.isArray(f.value) ? f.value : []);
    setClientes(cl.status === "fulfilled" && Array.isArray(cl.value) ? cl.value : []);
    setFormatos(fm.status === "fulfilled" && Array.isArray(fm.value) ? fm.value : []);
    setOrg(o.status === "fulfilled" ? o.value || {} : {});
    setErro(m.status === "rejected" ? true : null);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  const salvarMaterial = useCallback(async (dados, id) => {
    setCarregando(true);
    try {
      const dadosNum = { ...dados, categoria_id: Number(dados.categoria_id) || null };
      camposNumericos.forEach((k) => {
        dadosNum[k] = Number(dados[k]) || 0;
      });
      if (id) await atualizar(id, dadosNum);
      else await criar(dadosNum);
      await carregar();
      addToast(id ? "Material atualizado com sucesso" : "Material cadastrado com sucesso", "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
      return false;
    } finally {
      setCarregando(false);
    }
  }, [addToast, carregar]);

  const registrarMovimentacao = useCallback(async ({ item, tipo, dados }) => {
    const qtd = Number(dados.quantidade);
    const ehEntrada = tipo === "entrada";
    const payload = {
      material_id: item.id,
      tipo,
      quantidade: qtd,
      lote: dados.lote || undefined,
      validade: dados.validade || undefined,
      motivo: ehEntrada ? "Entrada manual" : "Saída manual",
      ...(ehEntrada ? { fornecedor_nome: dados.fornecedor } : { cliente_nome: dados.cliente }),
      solicitado_por: dados.solicitado_por || undefined,
      permitido_por: dados.permitido_por || undefined,
      observacoes: dados.observacoes || undefined,
    };
    const antes = materiais;
    setMateriais((prev) =>
      prev.map((m) => {
        if (m.id !== item.id) return m;
        const delta = ehEntrada ? qtd : -qtd;
        const proximo = {
          ...m,
          quantidade: Math.max(0, toNum(m.quantidade) + delta),
          estoque_disponivel: Math.max(0, toNum(m.estoque_disponivel) + delta),
        };
        return { ...proximo, status: statusDe(proximo) };
      })
    );
    try {
      await movimentar(payload);
      await carregar();
      addToast("Movimentação registada com sucesso", "success");
      return true;
    } catch (err) {
      setMateriais(antes);
      addToast(err.response?.data?.erro || "Erro na operação", "error");
      return false;
    }
  }, [materiais, addToast, carregar]);

  const converterFormatos = useCallback(async (dados) => {
    try {
      return await converter(dados);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao converter formatos", "error");
      return null;
    }
  }, [addToast]);

  const carregarReservas = useCallback(async (itemId) => {
    try {
      const r = await listarReservas();
      return Array.isArray(r) ? r.filter((x) => x.material_id === itemId) : [];
    } catch (err) {
      addToast("Erro ao carregar reservas", "error");
      return [];
    }
  }, [addToast]);

  const cancelarReservaDe = useCallback(async (reserva) => {
    try {
      await cancelarReserva(reserva.id);
      await carregar();
      addToast("Reserva cancelada", "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao cancelar reserva", "error");
      return false;
    }
  }, [addToast, carregar]);

  const alertas = useMemo(
    () => materiais.filter((i) => i.status === "repor" || i.status === "esgotado"),
    [materiais]
  );

  const totais = useMemo(
    () => ({
      itens: materiais.length,
      stock: materiais.reduce((s, i) => s + toNum(i.quantidade), 0),
      reservado: materiais.reduce((s, i) => s + toNum(i.estoque_reservado), 0),
      disponivel: materiais.reduce((s, i) => s + toNum(i.estoque_disponivel), 0),
    }),
    [materiais]
  );

  return {
    materiais, categorias, fornecedores, clientes, org, formatos,
    carregando, erro, carregar, nomeUsuario, totais, alertas,
    salvarMaterial, registrarMovimentacao, converterFormatos,
    carregarReservas, cancelarReservaDe,
  };
}
