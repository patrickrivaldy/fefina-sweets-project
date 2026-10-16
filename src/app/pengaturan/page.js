"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/config/supabase";
import { useRole } from "@/store/RoleContext";
import { LogOut, CircleUserRound } from "lucide-react";

export default function PengaturanPage() {
  const router = useRouter();
  const { role, pengguna, refresh } = useRole();
  const logout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    await refresh();
    router.replace("/login");
    router.refresh();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4">
        <PageHeader title="Profil" subtitle="Akun yang dipakai di perangkat ini." />
        <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <CircleUserRound size={26} />
          </span>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight">{pengguna?.nama_lengkap || "Pengguna Toko"}</h2>
          <p className="text-[13px] text-slate-500">{pengguna ? `@${pengguna.username}` : "Belum ditautkan ke data staf"}</p>
          <div className="mt-2 flex justify-center">
            <Badge tone={role === "Admin" ? "green" : role === "Owner" ? "yellow" : "blue"} dot={false}>{role}</Badge>
          </div>
          {!pengguna && (
            <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-amber-700">
              Akun loginmu belum tertaut ke tabel pengguna — menu tampil penuh (mode kompatibilitas).
              Minta Admin menautkan Auth ID-mu di menu Pengguna.
            </p>
          )}
          <button type="button" onClick={logout} className="mx-auto mt-5 flex h-12 items-center gap-2 rounded-xl bg-red-500 px-6 text-sm font-bold text-white hover:bg-red-600">
            <LogOut size={16} /> Keluar
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}
