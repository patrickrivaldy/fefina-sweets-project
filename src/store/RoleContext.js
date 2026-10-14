"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { supabase } from "@/config/supabase";

const RoleContext = createContext({ role: "Admin", pengguna: null, loading: true, refresh: async () => {} });

// Hak menu per peran (UI-level — RLS di database masih terbuka untuk semua login,
// jadi ini pembatas alur kerja, bukan pengaman. Lihat ARCHITECTURE.md).
export const MENU_PER_ROLE = {
  Admin: null, // null = semua menu
  Owner: ["/", "/produk", "/pengeluaran", "/catat-pengeluaran", "/transaksi", "/laporan", "/pengaturan"],
  Kasir: ["/kasir", "/stok", "/transaksi", "/pengaturan"],
};

export function bolehBuka(role, href) {
  const daftar = MENU_PER_ROLE[role];
  if (!daftar) return true;
  return daftar.includes(href);
}

export function RoleProvider({ children }) {
  const [role, setRole] = useState("Admin");
  const [pengguna, setPengguna] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole("Kasir");
        setPengguna(null);
        return;
      }
      // Cocokkan user Auth → tabel pengguna via auth_id (lihat db-draft.md tabel pengguna).
      const { data } = await supabase
        .from("pengguna")
        .select("id_pengguna, nama_lengkap, username, role_akses")
        .eq("auth_id", user.id)
        .eq("is_deleted", false)
        .maybeSingle();
      if (data?.role_akses) {
        setRole(data.role_akses);
        setPengguna(data);
      } else {
        // Belum ditautkan (misal instalasi lama) → akses penuh agar tidak terkunci.
        setRole("Admin");
        setPengguna(null);
      }
    } catch {
      setRole("Admin");
      setPengguna(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <RoleContext.Provider value={{ role, pengguna, loading, refresh }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
