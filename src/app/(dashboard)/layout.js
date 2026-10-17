"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import RouteGuard from "@/components/RouteGuard";
import { ToastProvider } from "@/components/Toast";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [colapsado, setColapsado] = useState(false);
  return (
    <RouteGuard>
      <ToastProvider>
        <div className="flex h-dvh flex-col overflow-hidden bg-background">
          <TopBar
            onOpenMenu={() => setMenuAberto(true)}
            onToggleColapso={() => setColapsado((v) => !v)}
            colapsado={colapsado}
          />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              aberto={menuAberto}
              onFechar={() => setMenuAberto(false)}
              colapsado={colapsado}
            />
            <main className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-5 lg:p-6">
              <div key={pathname} className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col animate-page-fade">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </RouteGuard>
  );
}
