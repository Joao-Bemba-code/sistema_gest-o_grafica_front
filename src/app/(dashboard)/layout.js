"use client";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import RouteGuard from "@/components/RouteGuard";
import { ToastProvider } from "@/components/Toast";

export default function DashboardLayout({ children }) {
  return (
    <RouteGuard>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col md:ml-64">
            <TopBar />
            <main className="flex-1 p-3 sm:p-6">
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
