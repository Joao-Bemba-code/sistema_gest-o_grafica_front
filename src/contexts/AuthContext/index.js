"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getUsuario, isAutenticado, carregarPerfil, logout as sair } from "@/services/auth";

const AuthContext = createContext();

const CHAVE_USUARIO = "sigraf_usuario";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarUsuario = async () => {
      if (!isAutenticado()) {
        setCarregando(false);
        return;
      }
      // O perfil guardado serve apenas para arranque imediato; a fonte de
      // verdade é o servidor (cookie HttpOnly). Nunca confiamos no JWT do
      // cliente para decidir organização ou permissões.
      setUsuario(getUsuario());
      try {
        const perfil = await carregarPerfil();
        if (perfil) {
          setUsuario(perfil);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(perfil));
          }
        }
      } catch (e) {
        // 401 já é tratado no interceptor (limpa sessão e redireciona).
        // Erros de rede/servidor não podem desligar o utilizador: mantém-se
        // a sessão guardada e o perfil é revalidado na próxima carga.
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
