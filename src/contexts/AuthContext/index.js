"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getUsuario, isAutenticado, getToken, decodificarToken, logout as sair } from "@/services/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarUsuario = async () => {
      if (isAutenticado()) {
        const armazenado = getUsuario();
        const payload = decodificarToken(getToken());
        const orgToken = payload?.organizacao_id;
        const orgUsuario = armazenado?.organizacao_id;
        if (orgToken == null || orgUsuario == null || String(orgToken) !== String(orgUsuario)) {
          sair();
        } else {
          setUsuario(armazenado);
        }
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
