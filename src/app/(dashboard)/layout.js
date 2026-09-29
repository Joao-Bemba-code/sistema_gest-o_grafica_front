"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import RouteGuard from "@/components/RouteGuard";
import { ToastProvider } from "@/components/Toast";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  return (
    <RouteGuard>
      <ToastProvider>
        <div className="flex min-h-screen overflow-x-clip bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 md:ml-64">
            <TopBar />
            <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 pb-16">
              <div key={pathname} className="animate-page-fade">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </RouteGuard>
  );
}
