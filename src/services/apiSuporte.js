import axios from "axios";

// Instância axios exclusiva do painel de suporte técnico.
// A sessão real vive no cookie HttpOnly `sigraf_suporte_token`; o browser não
// guarda o JWT. Só o perfil público fica em sessionStorage.
export const CHAVE_USUARIO = "sigraf_suporte_usuario";
const CHAVE_TOKEN_LEGADO = "sigraf_suporte_token";

const apiSuporte = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://[::1]:8000/api"}/suporte`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
  },
});

apiSuporte.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      // Limpa também a chave antiga que guardava o JWT em sessionStorage.
      window.sessionStorage.removeItem(CHAVE_TOKEN_LEGADO);
      window.sessionStorage.removeItem(CHAVE_USUARIO);
      const emLogin = window.location.pathname.startsWith("/suporte/login");
      if (!emLogin) {
        window.location.href = "/suporte/login";
      }
    }
    return Promise.reject(err);
  }
);

export default apiSuporte;
