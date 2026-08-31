"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getUsuario, isAutenticado, getToken, decodificarToken, carregarPerfil, logout as sair } from "@/services/auth";

const AuthContext = createContext();

const CHAVE_USUARIO = "sigraf_usuario";
const CHAVE_TOKEN = "sigraf_token";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarUsuario = async () => {
      if (!isAutenticado()) {
        setCarregando(false);
        return;
      }
      const armazenado = getUsuario();
      const payload = decodificarToken(getToken());
      const orgToken = payload?.organizacao_id;
      const orgUsuario = armazenado?.organizacao_id;
      if (orgToken == null || orgUsuario == null || String(orgToken) !== String(orgUsuario)) {
        sair();
        setCarregando(false);
        return;
      }
      // Revalida o perfil/permissões com o servidor para não usar dados antigos
      // (permitindo que alterações de perfil/permissões tenham efeito sem relogin).
      setUsuario(armazenado);
      try {
        const perfil = await carregarPerfil();
        if (perfil) {
          setUsuario(perfil);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfil));
          }
        }
      } catch (e) {
        // Token inválido/expirado → limpa a sessão.
        sair();
      }
      setCarregando(false);
    };
    carregarUsuario();
  }, []);

  const logout = () => {
    setUsuario(null);
    sair();
  };

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, logout, carregando, autenticado: !!usuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

