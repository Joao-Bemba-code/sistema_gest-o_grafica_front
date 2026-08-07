"use client";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
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
            <main className="flex-1 w-full max-w-[1680px] mx-auto p-3 sm:p-5 lg:p-7 xl:px-8">
              <div className="mb-4">
                <Breadcrumbs />
              </div>
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </RouteGuard>
  );
}
