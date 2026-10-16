import { supabase } from "@/config/supabase";

// Peta modal/HPP aktual per produk dari view_modal_produk.
// Dipakai Dashboard, Keuangan, Laporan, Produksi — satu definisi di sini.
export async function fetchModalMap() {
  const { data } = await supabase.from("view_modal_produk").select("id_produk, modal_hpp_aktual");
  const map = {};
  for (const row of data || []) map[row.id_produk] = Number(row.modal_hpp_aktual) || 0;
  return map;
}
