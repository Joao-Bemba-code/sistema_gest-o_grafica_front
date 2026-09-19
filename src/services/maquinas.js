import api from "./api";
import { listar as listarMateriais } from "./materiais";
import { ehEquipamento, especificacoesObjeto } from "@/lib/estoque";

function maquinaDeMaterial(m) {
  const esp = especificacoesObjeto(m.especificacoes);
  return {
    id: `s${m.id}`,
    origem: "stock",
    material_id: m.id,
    codigo: m.codigo || "",
    nome_comum: m.nome,
    nome_tecnico: m.nome_tecnico || "",
    descricao: m.descricao || "",
    categoria_id: m.categoria_id || null,
    subfamilia: esp.subfamilia || m.categoria?.subfamilia || "",
    fornecedor: m.fornecedor || "",
    unidade: m.unidade || "un",
    marca: esp.marca || "",
    modelo: esp.modelo || "",
    numero_serie: esp.numero_serie || "",
    numero_patrimonial: esp.numero_patrimonial || "",
    fabricante: esp.fabricante || "",
    estado: "operacional",
    localizacao: m.localizacao || "",
    custo_unit: m.custo_unit || 0,
    margem: m.margem || m.lucro || 0,
    quantidade: m.quantidade || 0,
  };
}

export async function listar() {
  const [maq, mats] = await Promise.all([api.get("/maquinas"), listarMateriais()]);
  const maquinas = Array.isArray(maq.data) ? maq.data : maq.data?.data || [];
  const materiais = Array.isArray(mats) ? mats : mats?.data || [];
  const vistos = new Set(maquinas.map((m) => String(m.nome_comum || "").trim().toLowerCase()));
  const extra = [];
  for (const m of materiais) {
    if (!m?.categoria || !ehEquipamento(m.categoria)) continue;
    const nome = m.nome;
    if (!nome) continue;
    const chave = String(nome).trim().toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    extra.push(maquinaDeMaterial(m));
  }
  return [...maquinas, ...extra];
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/maquinas/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/maquinas", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/maquinas/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/maquinas/${id}`);
  return data;
}
