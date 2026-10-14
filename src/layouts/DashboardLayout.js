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
    <div className="min-h-screen bg-[#f8f9ff]">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-60">
        <Header onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-20 sm:px-6">
          {ditahan ? (
            <EmptyState
              icon={<ShieldAlert size={24} />}
              title="Di luar peranmu"
              message={`Halaman ini khusus peran lain. Peranmu saat ini: ${role}. Minta Admin menautkan akunmu di menu Pengguna.`}
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
