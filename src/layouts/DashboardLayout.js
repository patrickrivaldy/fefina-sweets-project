"use client";

import { usePathname } from "next/navigation";
import { useRole, bolehBuka } from "@/store/RoleContext";
import EmptyState from "@/components/ui/EmptyState";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";

export default function DashboardLayout({ children }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const { role, loading } = useRole();
  const ditahan = !loading && !bolehBuka(role, path);

  return (
    <div className="min-h-dvh overflow-x-clip bg-[#f7f9fd] text-slate-900">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />
      <div className="min-h-dvh lg:pl-60">
        <Header onMenu={() => setOpen(true)} />
        <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1600px] px-3 pb-8 pt-[76px] sm:px-5 sm:pb-10 sm:pt-20 xl:px-8">
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-7 py-8 shadow-sm">
                <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-100 border-t-emerald-700" />
                <p className="text-sm font-medium text-slate-500">
                  Memverifikasi akses pengguna...
                </p>
              </div>
            </div>
          ) : ditahan ? (
            <div className="mx-auto mt-8 max-w-xl">
              <EmptyState
                icon={<ShieldAlert size={24} />}
                title="Di luar peranmu"
                message={`Halaman ini khusus peran lain. Peranmu saat ini: ${role}. Minta Admin menautkan akunmu di menu Pengguna.`}
              />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
