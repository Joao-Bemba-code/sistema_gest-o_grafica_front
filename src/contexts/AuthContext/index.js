"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getUsuario, isAutenticado, logout as sair } from "@/services/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (isAutenticado()) {
      setUsuario(getUsuario());
    }
    setCarregando(false);
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
