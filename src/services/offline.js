import axios from "axios";

export const SERVIDOR_PADRAO =
  process.env.NEXT_PUBLIC_SERVIDOR_URL ||
  "https://sistema-gest-o-grafica-back-m6px.onrender.com";

function baseOffline() {
  const apiBase =
    typeof window !== "undefined" && window.sigrafDesktop
      ? window.sigrafDesktop.apiBase
      : null;
  if (!apiBase) return null;
  return apiBase.replace(/\/api$/, "") + "/api/offline";
}

export function desktopDisponivel() {
  return typeof window !== "undefined" && !!window.sigrafDesktop;
}

export async function estadoOffline() {
  const base = baseOffline();
  if (!base) return null;
  const { data } = await axios.get(base + "/sync/estado");
  return data;
}

export async function ligarServidor({ url, email, senha }) {
  const base = baseOffline();
  if (!base) throw new Error("Aplicação desktop necessária");
  const { data } = await axios.post(base + "/sync/ligar", { url, email, senha });
  return data;
}

export async function desligarServidor() {
  const base = baseOffline();
  if (!base) throw new Error("Aplicação desktop necessária");
  const { data } = await axios.post(base + "/sync/desligar");
  return data;
}

export async function sincronizarAgora() {
  const base = baseOffline();
  if (!base) throw new Error("Aplicação desktop necessária");
  const { data } = await axios.post(base + "/sync/agora");
  return data;
}

export async function loginServidor({ email, senha }) {
  const base = baseOffline();
  if (!base) throw new Error("Aplicação desktop necessária");
  const { data } = await axios.post(base + "/auth/login", { email, senha });
  return data;
}
