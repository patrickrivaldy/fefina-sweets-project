"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { supabase } from "@/config/supabase";

const RoleContext = createContext({ role: null, pengguna: null, loading: true, refresh: async () => {} });

export const MENU_PER_ROLE = {
  Admin: null,
  Owner: ["/", "/produk", "/pengeluaran", "/catat-pengeluaran", "/transaksi", "/laporan", "/pengaturan"],
  Kasir: ["/kasir", "/stok", "/transaksi", "/pengaturan"],
};

export function bolehBuka(role, href) {
  if (role === "Admin") return true;
  const daftar = MENU_PER_ROLE[role];
  if (!Array.isArray(daftar)) return false;
  return daftar.includes(href);
}

export function RoleProvider({ children }) {
  const [role, setRole] = useState(null);
  const [pengguna, setPengguna] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setRole(null);
        setPengguna(null);
        return;
      }

      const { data, error } = await supabase
        .from("pengguna")
        .select("id_pengguna, nama_lengkap, username, role_akses")
        .eq("auth_id", user.id)
        .eq("is_deleted", false)
        .maybeSingle();

      if (error) throw error;
      if (data?.role_akses && Object.prototype.hasOwnProperty.call(MENU_PER_ROLE, data.role_akses)) {
        setRole(data.role_akses);
        setPengguna(data);
      } else {
        setRole(null);
        setPengguna(null);
      }
    } catch {
      setRole(null);
      setPengguna(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        // Hindari memanggil Supabase secara sinkron di callback auth.
        Promise.resolve().then(() => refresh());
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <RoleContext.Provider value={{ role, pengguna, loading, refresh }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
