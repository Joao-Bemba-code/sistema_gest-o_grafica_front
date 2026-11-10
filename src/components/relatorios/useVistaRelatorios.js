"use client";

import { useMemo, useState } from "react";

const chaveStorage = (escopo) => `sigraf:relatorios:vista:${escopo}`;

const padraoDe = (itens) => new Set(itens.filter((i) => i.padrao).map((i) => i.id));

// Lê a escolha guardada para o escopo; valida os ids contra os blocos existentes.
const ler = (escopo, itens) => {
  try {
    const bruto = window.localStorage.getItem(chaveStorage(escopo));
    if (!bruto) return padraoDe(itens);
    const ids = JSON.parse(bruto);
    if (!Array.isArray(ids)) return padraoDe(itens);
    const validos = new Set(itens.map((i) => i.id));
    // Se o registo mudou (ids desconhecidos), volta à sugestão em vez de esconder tudo.
    if (ids.some((id) => !validos.has(id))) return padraoDe(itens);
    return new Set(ids);
  } catch {
    return padraoDe(itens);
  }
};

export default function useVistaRelatorios(escopo, itens) {
  // Alterações feitas nesta sessão, por escopo. Sem efeito no primeiro render:
  // a escolha guardada é lida de forma síncrona e validada.
  const [alteracoes, setAlteracoes] = useState({});
  const guardadas = useMemo(() => ler(escopo, itens), [escopo, itens]);
  const visiveis = alteracoes[escopo] ?? guardadas;

  const gravar = (proximos) => {
    try {
      window.localStorage.setItem(chaveStorage(escopo), JSON.stringify([...proximos]));
    } catch {
      // sem persistência disponível — a escolha fica só nesta sessão
    }
  };

  const aplicar = (proximos) => {
    gravar(proximos);
    setAlteracoes((p) => ({ ...p, [escopo]: proximos }));
  };

  const alternar = (id) => {
    const proximos = new Set(visiveis);
    if (proximos.has(id)) proximos.delete(id);
    else proximos.add(id);
    aplicar(proximos);
  };

  const mostrarTudo = () => aplicar(new Set(itens.map((i) => i.id)));

  const restaurar = () => aplicar(padraoDe(itens));

  return {
    visiveis,
    visivel: (id) => visiveis.has(id),
    alternar,
    mostrarTudo,
    restaurar,
    nOcultos: itens.filter((i) => !visiveis.has(i.id)).length,
  };
}
