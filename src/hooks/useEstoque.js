"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  listar,
  criar as criarMaterial,
  atualizar as atualizarMaterial,
  movimentar,
  converter,
  listarReservas,
  cancelarReserva,
  reservar,
  listarFormatos,
} from "@/services/materiais";
import { criar as criarMaquina, atualizar as atualizarMaquina, listar as listarMaquinas } from "@/services/maquinas";
import { listar as listarCategorias } from "@/services/categorias";
import { listar as listarFornecedores } from "@/services/fornecedores";
import { listar as listarClientes } from "@/services/clientes";
import { buscarOrganizacao } from "@/services/configuracoes";
import { getUsuario } from "@/services/auth";
import { useToast } from "@/components/Toast";
import { statusDe, toNum, especificacoesObjeto, ehEquipamento, moverEstoqueDe } from "@/lib/estoque";

const camposNumericos = [
  "gramagem", "largura", "altura", "percentual_quebra",
  "estoque_min", "estoque_max", "ponto_ressuprimento", "custo_unit", "lucro",
];

async function sincronizarMaquina(dados, id) {
  const esp = especificacoesObjeto(dados.especificacoes);
  const maquinaDados = {
    codigo: dados.codigo || "",
    nome_comum: dados.nome || "",
    nome_tecnico: dados.nome_tecnico || "",
    descricao: dados.descricao || "",
    categoria_id: dados.categoria_id || null,
    subfamilia: esp.subfamilia || "",
    fornecedor: dados.fornecedor || "",
    unidade: dados.unidade || "un",
    marca: esp.marca || "",
    modelo: esp.modelo || "",
    numero_serie: esp.numero_serie || "",
    localizacao: dados.localizacao || "",
    custo_unit: toNum(dados.custo_unit),
    estoque_min: toNum(dados.estoque_min),
    estoque_max: toNum(dados.estoque_max),
  };
  const maquinas = await listarMaquinas();
  const arr = Array.isArray(maquinas) ? maquinas : maquinas?.data || [];
  const alvo =
    arr.find((m) => m.codigo && m.codigo === maquinaDados.codigo) ||
    arr.find((m) => m.nome_comum === maquinaDados.nome_comum);
  if (alvo) await atualizarMaquina(alvo.id, maquinaDados);
  else await criarMaquina({ ...maquinaDados, estado: "operacional" });
}

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
    setCategorias(c.status === "fulfilled" && Array.isArray(c.value) ? c.value.filter((cat) => cat.tipo !== "servico") : []);
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
      const categoria = categorias.find((c) => String(c.id) === String(dadosNum.categoria_id));
      if (dadosNum.mover_estoque === undefined) {
        dadosNum.mover_estoque = moverEstoqueDe(categoria);
      }
      if (id) await atualizarMaterial(id, dadosNum);
      else await criarMaterial(dadosNum);
      if (ehEquipamento(categoria)) {
        try {
          await sincronizarMaquina(dadosNum, id);
        } catch (err) {
          addToast(err.response?.data?.erro || "Material guardado, mas houve erro ao registar a máquina", "warning");
        }
      }
      await carregar();
      addToast(id ? "Material atualizado com sucesso" : "Material cadastrado com sucesso", "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
      return false;
    } finally {
      setCarregando(false);
    }
  }, [addToast, carregar, categorias]);

  const registrarMovimentacao = useCallback(async ({ item, tipo, dados }) => {
    const qtd = Number(dados.quantidade);
    const isEntrada = tipo === "entrada";
    const motivos = { entrada: "Entrada manual", saida: "Saída manual", perda: `Perda — ${dados.motivo || ""}`, desperdicio: `Desperdício — ${dados.motivo || ""}` };
    const payload = {
      material_id: item.id,
      tipo,
      quantidade: qtd,
      motivo: motivos[tipo] || tipo,
      ...(isEntrada ? { fornecedor_nome: dados.fornecedor } : tipo === "saida" ? { cliente_nome: dados.cliente } : {}),
      observacoes: dados.detalhes || dados.observacoes || undefined,
    };
    const antes = materiais;
    setMateriais((prev) =>
      prev.map((m) => {
        if (m.id !== item.id) return m;
        const delta = isEntrada ? qtd : -qtd;
        const proximo = { ...m, quantidade: Math.max(0, toNum(m.quantidade) + delta), estoque_disponivel: Math.max(0, toNum(m.estoque_disponivel) + delta) };
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

  const registrarTransferencia = useCallback(async ({ material_origem_id, quantidade, armazem_externo, responsavel, autorizado_por, data, observacoes }) => {
    const qtd = Number(quantidade);
    const antes = materiais;
    setMateriais((prev) =>
      prev.map((m) => {
        if (m.id === material_origem_id) {
          const proximo = { ...m, quantidade: Math.max(0, toNum(m.quantidade) - qtd), estoque_disponivel: Math.max(0, toNum(m.estoque_disponivel) - qtd) };
          return { ...proximo, status: statusDe(proximo) };
        }
        return m;
      })
    );
    try {
      await movimentar({
        material_id: material_origem_id,
        tipo: "transferencia",
        quantidade: qtd,
        motivo: `Saída para armazém externo: ${armazem_externo}`,
        solicitado_por: responsavel,
        permitido_por: autorizado_por,
        observacoes: `Destino: ${armazem_externo}${data ? ` | Data: ${data}` : ""}${observacoes ? ` | ${observacoes}` : ""}`,
      });
      await carregar();
      addToast("Transferência para armazém externo registada", "success");
      return true;
    } catch (err) {
      setMateriais(antes);
      addToast(err.response?.data?.erro || "Erro na transferência", "error");
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

  const reservarMaterial = useCallback(async (dados) => {
    try {
      await reservar({ itens: [{ material_id: dados.material_id, quantidade: dados.quantidade, lote: dados.lote }] });
      await carregar();
      addToast("Material reservado com sucesso", "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao reservar material", "error");
      return false;
    }
  }, [addToast, carregar]);

  const alertas = useMemo(
    () => materiais.filter((i) => i.mover_estoque !== false && (i.status === "repor" || i.status === "esgotado")),
    [materiais]
  );

  const totais = useMemo(() => {
    const movem = materiais.filter((i) => i.mover_estoque !== false);
    return {
      itens: movem.length,
      stock: movem.reduce((s, i) => s + toNum(i.quantidade), 0),
      reservado: movem.reduce((s, i) => s + toNum(i.estoque_reservado), 0),
      disponivel: movem.reduce((s, i) => s + toNum(i.estoque_disponivel), 0),
    };
  }, [materiais]);

  return {
    materiais, categorias, fornecedores, clientes, org, formatos,
    carregando, erro, carregar, nomeUsuario, totais, alertas,
    salvarMaterial, registrarMovimentacao, registrarTransferencia, converterFormatos,
    carregarReservas, cancelarReservaDe, reservarMaterial,
  };
}
