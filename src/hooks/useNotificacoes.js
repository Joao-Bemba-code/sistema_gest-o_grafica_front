"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { listar as listarMateriais } from "@/services/materiais";
import { listarOrdens } from "@/services/producao";
import { listarFaturas } from "@/services/faturacao";
import { getUsuario } from "@/services/auth";

const CHAVE_LIDAS = "sigraf-notif-lidas";

function chaveLidas() {
  const org = getUsuario()?.organizacao_id;
  return org != null ? `${CHAVE_LIDAS}-org-${org}` : CHAVE_LIDAS;
}

const prioridade = { error: 0, warning: 1, info: 2, success: 3 };

function formatHora(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function useNotificacoes() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [lidas, setLidas] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(chaveLidas());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const carregar = useCallback(() => {
    Promise.allSettled([listarMateriais(), listarOrdens(), listarFaturas()])
      .then(([m, o, f]) => {
        const mats = m.status === "fulfilled" && Array.isArray(m.value) ? m.value : [];
        const ordens = o.status === "fulfilled" && Array.isArray(o.value) ? o.value : [];
        const faturas = f.status === "fulfilled" && Array.isArray(f.value) ? f.value : [];
        const hoje = new Date();
        const nova = [];

        mats
          .filter((x) => x.status === "esgotado" || x.status === "repor")
          .forEach((x) => {
            const esgotado = x.status === "esgotado";
            nova.push({
              id: `stock-${x.id}`,
              nivel: esgotado ? "error" : "warning",
              icon: esgotado ? "error" : "warning",
              titulo: `Estoque ${esgotado ? "esgotado" : "baixo"}: ${x.nome}`,
              desc: `${x.estoque_disponivel ?? 0}/${x.ponto_ressuprimento || x.estoque_min} ${x.unidade || "un"} disponíveis`,
              tempo: hoje.toISOString(),
              link: "/estoque",
            });
          });

        ordens
          .filter((x) => ["finalizado", "entregue"].includes(x.estado))
          .slice(-5)
          .forEach((x) => {
            nova.push({
              id: `ordem-ok-${x.id}`,
              nivel: "success",
              icon: "check_circle",
              titulo: `Ordem #${x.numero || x.id} concluída`,
              desc: x.produto || "Produção",
              tempo: x.createdAt || hoje.toISOString(),
              link: "/producao/ordens",
            });
          });

        ordens
          .filter(
            (x) =>
              x.data_entrega &&
              !["entregue", "finalizado", "cancelado"].includes(x.estado) &&
              new Date(x.data_entrega) < hoje
          )
          .forEach((x) => {
            nova.push({
              id: `ordem-atraso-${x.id}`,
              nivel: "error",
              icon: "schedule",
              titulo: `Ordem #${x.numero || x.id} em atraso`,
              desc: `${x.produto || "Produção"} — entrega ${formatHora(x.data_entrega)}`,
              tempo: x.createdAt || hoje.toISOString(),
              link: "/producao/ordens",
            });
          });

        faturas
          .filter((x) => x.estado === "vencida")
          .forEach((x) => {
            nova.push({
              id: `fatura-${x.id}`,
              nivel: "error",
              icon: "payments",
              titulo: `Fatura #${x.numero || x.id} vencida`,
              desc: `Kz ${Number(x.total || x.valor || 0).toLocaleString("pt-AO")} — ${x.cliente?.nome || "sem cliente"}`,
              tempo: x.data_vencimento || hoje.toISOString(),
              link: "/faturacao",
            });
          });

        nova.sort((a, b) => {
          const pa = prioridade[a.nivel] ?? 9;
          const pb = prioridade[b.nivel] ?? 9;
          if (pa !== pb) return pa - pb;
          return new Date(b.tempo) - new Date(a.tempo);
        });

        setItens(nova.slice(0, 12));
        setCarregando(false);
      });
  }, []);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 30000);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  const naoLidas = useMemo(() => itens.filter((n) => !lidas[n.id]), [itens, lidas]);

  const marcarLida = useCallback((id) => {
    setLidas((prev) => {
      if (prev[id]) return prev;
      const proximo = { ...prev, [id]: true };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(chaveLidas(), JSON.stringify(proximo));
      }
      return proximo;
    });
  }, []);

  const marcarTodasLidas = useCallback(() => {
    setLidas((prev) => {
      const proximo = { ...prev };
      itens.forEach((n) => {
        proximo[n.id] = true;
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(chaveLidas(), JSON.stringify(proximo));
      }
      return proximo;
    });
  }, [itens]);

  return { notificacoes: itens, carregando, naoLidas, marcarLida, marcarTodasLidas };
}
