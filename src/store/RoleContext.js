"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { supabase } from "@/config/supabase";

<<<<<<< HEAD
const RoleContext = createContext({ role: null, pengguna: null, loading: true, refresh: async () => {} });
=======
const RoleContext = createContext({ role: "Admin", pengguna: null, loading: true, refresh: async () => {} });
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354

// Hak menu per peran (UI-level — RLS di database masih terbuka untuk semua login,
// jadi ini pembatas alur kerja, bukan pengaman. Lihat ARCHITECTURE.md).
export const MENU_PER_ROLE = {
  Admin: null, // null = semua menu
  Owner: ["/", "/produk", "/pengeluaran", "/catat-pengeluaran", "/transaksi", "/laporan", "/pengaturan"],
  Kasir: ["/kasir", "/stok", "/transaksi", "/pengaturan"],
};

export function bolehBuka(role, href) {
<<<<<<< HEAD
   if (role === "Admin") return true;

  const daftar = MENU_PER_ROLE[role];
   if (!Array.isArray(daftar)) return false;
=======
  const daftar = MENU_PER_ROLE[role];
  if (!daftar) return true;
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
  return daftar.includes(href);
}

export function RoleProvider({ children }) {
<<<<<<< HEAD
  const [role, setRole] = useState(null);
=======
  const [role, setRole] = useState("Admin");
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
  const [pengguna, setPengguna] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
<<<<<<< HEAD
        setRole(null);
=======
        setRole("Kasir");
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
        setPengguna(null);
        return;
      }
      // Cocokkan user Auth → tabel pengguna via auth_id (lihat db-draft.md tabel pengguna).
<<<<<<< HEAD
      const { data, error } = await supabase
=======
      const { data } = await supabase
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
        .from("pengguna")
        .select("id_pengguna, nama_lengkap, username, role_akses")
        .eq("auth_id", user.id)
        .eq("is_deleted", false)
        .maybeSingle();
<<<<<<< HEAD

      console.log("Data role pengguna:", data);
      console.log("Error query pengguna:", error);
      if (
          data?.role_akses &&
          Object.prototype.hasOwnProperty.call(MENU_PER_ROLE, data.role_akses)
        ) {
          setRole(data.role_akses);
          setPengguna(data);
        } else {
          setRole(null);
          setPengguna(null);
        }
    } catch {
      setRole(null);
=======
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
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
      setPengguna(null);
    } finally {
      setLoading(false);
    }
  }, []);

<<<<<<< HEAD
  useEffect(() => { refresh(); }, [refresh]);
=======
  useEffect(() => {
    // Muat awal + perbarui peran tiap status login berubah (masuk/keluar) agar
    // menu tidak basi — sebelumnya harus refresh manual dulu baru sesuai peran.
    // INITIAL_SESSION dikirim otomatis saat subscribe (pengganti refresh langsung).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354

  return (
    <RoleContext.Provider value={{ role, pengguna, loading, refresh }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
