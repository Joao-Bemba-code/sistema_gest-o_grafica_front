"use client";

import { useEffect } from "react";

// Com skipWaiting, uma nova versão do service worker assume o controlo sem
// esperar pelo fecho das abas. Sem este listener, a aba antiga continuava a
// correr os chunks antigos até uma recarga manual (e muitos utilizadores não a
// fazem). Só recarrega quando já havia um controlador, para não haver um
// reload extra na primeira instalação.
export default function PwaReload() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const tinhaControlador = Boolean(navigator.serviceWorker.controller);
    let aRecarregar = false;
    const aoMudarControlador = () => {
      if (!tinhaControlador || aRecarregar) return;
      aRecarregar = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", aoMudarControlador);
    navigator.serviceWorker.getRegistration().then((reg) => reg?.update().catch(() => {}));
    return () => navigator.serviceWorker.removeEventListener("controllerchange", aoMudarControlador);
  }, []);
  return null;
}
