"use client";

import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import EncomendasTab from "@/components/vendas/EncomendasTab";
import { listar as listarOrcamentos } from "@/services/orcamentos";
import { buscarOrganizacao } from "@/services/configuracoes";

// A produção precisa de ver as encomendas aprovadas para lhes criar a OP.
// Carrega aqui os dados comerciais que a lista reutilizada do módulo de vendas
// espera, sem expor a facturação (o perfil de produção não tem acesso a ela).
export default function EncomendasProducaoTab({ onCriarOp }) {
  const { addToast } = useToast();
  const [orcamentos, setOrcamentos] = useState([]);
  const [empresa, setEmpresa] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      try {
        const [orcData, empData] = await Promise.all([
          listarOrcamentos().catch(() => []),
          buscarOrganizacao().catch(() => null),
        ]);
        if (!ativo) return;
        setOrcamentos(Array.isArray(orcData) ? orcData : orcData?.data ?? []);
        if (empData) setEmpresa(empData);
      } catch {
        if (ativo) addToast("Erro ao carregar as encomendas", "error");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const atualizar = async () => {
    const dados = await listarOrcamentos().catch(() => []);
    setOrcamentos(Array.isArray(dados) ? dados : dados?.data ?? []);
  };

  if (loading) return <ListSkeleton lines={8} />;

  return (
    <EncomendasTab
      orcamentos={orcamentos}
      faturas={[]}
      empresa={empresa}
      onAtualizar={atualizar}
      modoProducao
      onCriarOp={onCriarOp}
    />
  );
}
