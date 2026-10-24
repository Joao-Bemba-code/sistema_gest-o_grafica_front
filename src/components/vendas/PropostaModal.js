"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { listar as listarClientes } from "@/services/clientes";
import { criar, atualizar, UNIDADES } from "@/services/propostas";

const VAZIO = {
  unidade: "UN-01",
  cliente_id: "",
  objecto: "",
  descricao: "",
  prazo_execucao: "",
  validade: "30",
};

function formInicial(proposta) {
  if (!proposta?.id) return VAZIO;
  return {
    unidade: proposta.unidade || "UN-01",
    cliente_id: proposta.cliente_id ? String(proposta.cliente_id) : "",
    objecto: proposta.objecto || "",
    descricao: proposta.descricao || "",
    prazo_execucao: proposta.prazo_execucao || "",
    validade: String(proposta.validade ?? 30),
  };
}

const campoCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/25";

const rotuloCls = "text-xs font-semibold text-muted-foreground";

export default function PropostaModal({ open, proposta, onClose, onSaved }) {
  const { addToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(() => formInicial(proposta));
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(proposta?.id);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      try {
        const dados = await listarClientes({ tipo: "cliente" });
        if (!ativo) return;
        setClientes(Array.isArray(dados) ? dados : dados?.data ?? []);
      } catch {
        if (ativo) addToast("Erro ao carregar clientes", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [open, addToast]);

  const setField = (nome, valor) => setForm((p) => ({ ...p, [nome]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) return addToast("Escolha o cliente da proposta", "error");
    if (!form.objecto.trim()) return addToast("Indique o objecto da proposta", "error");
    setSalvando(true);
    try {
      const dados = {
        unidade: form.unidade,
        cliente_id: form.cliente_id,
        objecto: form.objecto.trim(),
        descricao: form.descricao.trim(),
        prazo_execucao: form.prazo_execucao.trim(),
        validade: Number(form.validade) || 0,
      };
      const salva = editando ? await atualizar(proposta.id, dados) : await criar(dados);
      addToast(editando ? "Proposta atualizada" : "Proposta criada", "success");
      onSaved?.(salva);
      onClose?.();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar a proposta", "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={Boolean(open)}
      onClose={onClose}
      title={editando ? `Editar proposta ${proposta?.numero || ""}` : "Nova proposta"}
      icon="description"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-proposta" loading={salvando}>
            <Icon name="save" className="text-lg" /> Guardar proposta
          </Button>
        </>
      }
    >
      {carregando ? (
        <div className="space-y-3" aria-label="A carregar formulário">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <form id="form-proposta" onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={rotuloCls}>Unidade de negócio</span>
              <select
                value={form.unidade}
                onChange={(e) => setField("unidade", e.target.value)}
                className={campoCls}
                required
              >
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={rotuloCls}>Cliente</span>
              <select
                value={form.cliente_id}
                onChange={(e) => setField("cliente_id", e.target.value)}
                className={campoCls}
                required
              >
                <option value="">Escolher cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.empresa ? `${c.empresa} · ${c.nome}` : c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={rotuloCls}>Objecto da proposta</span>
            <input
              value={form.objecto}
              onChange={(e) => setField("objecto", e.target.value)}
              className={campoCls}
              placeholder="Ex.: Impressão de 5.000 flyers A5"
              maxLength={200}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={rotuloCls}>Descrição</span>
            <textarea
              value={form.descricao}
              onChange={(e) => setField("descricao", e.target.value)}
              className={`${campoCls} h-auto min-h-28 resize-y py-2.5`}
              placeholder="O que se propõe ao cliente, materiais, quantidades, condições…"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={rotuloCls}>Prazo de execução</span>
              <input
                value={form.prazo_execucao}
                onChange={(e) => setField("prazo_execucao", e.target.value)}
                className={campoCls}
                placeholder="Ex.: 10 dias úteis"
                maxLength={100}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={rotuloCls}>Validade (dias)</span>
              <input
                type="number"
                min="0"
                max="3650"
                value={form.validade}
                onChange={(e) => setField("validade", e.target.value)}
                className={campoCls}
                placeholder="30"
              />
            </label>
          </div>
        </form>
      )}
    </Modal>
  );
}
