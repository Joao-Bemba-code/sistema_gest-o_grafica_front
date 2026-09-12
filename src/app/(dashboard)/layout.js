"use client";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import RouteGuard from "@/components/RouteGuard";
import { ToastProvider } from "@/components/Toast";

export default function DashboardLayout({ children }) {
  return (
    <RouteGuard>
      <ToastProvider>
        <div className="flex min-h-screen overflow-x-clip">
          <div className="scanlines" aria-hidden="true" />
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 md:ml-64">
            <TopBar />
            <main className="flex-1 w-full max-w-[1680px] mx-auto p-4 sm:p-6 lg:p-8 xl:px-8">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </RouteGuard>
  );
}
