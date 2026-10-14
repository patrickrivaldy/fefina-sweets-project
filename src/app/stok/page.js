"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/config/supabase";
import { formatRupiah, pesanErrorDb } from "@/utils/format";
import { STOK_KRITIS } from "@/constants/app";
import { Boxes, Minus, Plus, Search } from "lucide-react";

export default function StokPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [busyId, setBusyId] = useState(null);
  const [saveErr, setSaveErr] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("produk")
      .select("id_produk, nama_produk, stok, harga_jual, foto")
      .eq("is_deleted", false)
      .order("stok", { ascending: true });
    if (error) {
      setError("Gagal memuat stok.");
      setRows([]);
    } else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (q.trim() && !r.nama_produk?.toLowerCase().includes(q.trim().toLowerCase()))
          return false;
        if (filter === "Menipis" && !(r.stok > 0 && r.stok <= STOK_KRITIS)) return false;
        if (filter === "Habis" && r.stok !== 0) return false;
        if (filter === "Aman" && r.stok <= STOK_KRITIS) return false;
        return true;
      }),
    [rows, q, filter]
  );

  const menipis = rows.filter((r) => r.stok > 0 && r.stok <= STOK_KRITIS).length;
  const habis = rows.filter((r) => r.stok === 0).length;

  // Penyesuaian via tabel penyesuaian_stok supaya trigger DB ikut jalan:
  // update produk.stok + batch_produk FIFO + catat pengeluaran_toko bila selisih minus.
  const ubah = async (row, delta) => {
    const baru = row.stok + delta;
    if (baru < 0 || busyId) return;
    setBusyId(row.id_produk);
    setSaveErr("");
    try {
      // Cek dini: pengurangan memicu trigger yang mencatat rugi = selisih × HPP.
      // Bila HPP produk Rp 0 dan db-draft.md BAGIAN 5 terbaru belum dijalankan,
      // insert DITOLAK database (CHECK nominal > 0) — ingatkan dulu, tetap dicoba.
      if (delta < 0) {
        const { data: v } = await supabase
          .from("view_modal_produk")
          .select("modal_hpp_aktual")
          .eq("id_produk", row.id_produk)
          .single();
        if (!v || Number(v.modal_hpp_aktual) === 0) {
          setSaveErr("Peringatan: HPP produk ini Rp 0. Pengurangan bisa gagal bila db-draft.md BAGIAN 5 terbaru belum dijalankan di SQL Editor. Tetap dicoba…");
        }
      }
      const { error } = await supabase.from("penyesuaian_stok").insert([
        {
          id_produk: row.id_produk,
          stok_fisik: baru,
          keterangan: `Penyesuaian cepat (${delta > 0 ? "+" : ""}${delta}) via menu Stok`,
        },
      ]);
      if (error) throw new Error(error.message);
      setSaveErr("");
      setRows((prev) => prev.map((p) => (p.id_produk === row.id_produk ? { ...p, stok: baru } : p)));
    } catch (e) {
      setSaveErr(pesanErrorDb(e.message));
    } finally {
      setBusyId(null);
    }
  };

  const tone = (s) => (s === 0 ? "red" : s <= STOK_KRITIS ? "yellow" : "green");
  const label = (s) => (s === 0 ? "Habis" : s <= STOK_KRITIS ? "Menipis" : "Aman");

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          eyebrow="Persediaan Real-Time"
          title="Stok"
          subtitle="Otomatis berkurang tiap penjualan. Atur cepat di sini tercatat sebagai opname resmi."
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[
            ["Jenis", rows.length, ""],
            ["Menipis", menipis, "text-amber-700"],
            ["Habis", habis, "text-red-600"],
          ].map(([l, v, accent]) => (
            <div key={l} className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200/70 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{l}</p>
              <p className={`tnum mt-1 break-words text-2xl font-bold ${accent}`}>{loading ? "…" : v}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-lg bg-[#eff4ff] px-3.5 focus-within:ring-2 focus-within:ring-emerald-600/25">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari produk…"
                className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["Semua", "Menipis", "Habis", "Aman"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`h-10 rounded-lg px-4 text-[13px] font-bold ${filter === f ? "bg-emerald-700 text-white shadow-sm" : "bg-[#eff4ff] text-slate-600 hover:bg-slate-200"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {saveErr && (
          <div className="rounded-xl bg-red-50 p-4 text-center text-[13px] font-semibold text-red-600 ring-1 ring-red-200">{saveErr}</div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Memuat…</div>
        ) : error ? (
          <EmptyState icon={<Boxes size={24} />} title="Gagal" message={error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Boxes size={24} />} title="Tidak cocok" message="Ubah kata kunci / filter." />
        ) : (
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {filtered.map((r) => (
              <article key={r.id_produk} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                    {r.foto ? (
                      <Image src={r.foto} alt={r.nama_produk} width={48} height={48} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Boxes size={20} className="text-slate-300" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-bold">{r.nama_produk}</p>
                    <p className="tnum text-[11px] text-slate-500">{formatRupiah(r.harga_jual)}</p>
                  </div>
                  <Badge tone={tone(r.stok)}>{label(r.stok)}</Badge>
                </div>
                <div className="mt-3 rounded-xl bg-[#eff4ff]/70 p-2.5 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button type="button" disabled={busyId === r.id_produk || r.stok < 1} onClick={() => ubah(r, -1)} aria-label="Kurangi 1" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 disabled:opacity-40">
                        <Minus size={15} />
                      </button>
                      <span className="tnum w-12 text-center text-lg font-bold">
                        {busyId === r.id_produk ? "…" : r.stok}
                      </span>
                      <button type="button" disabled={busyId === r.id_produk} onClick={() => ubah(r, 1)} aria-label="Tambah 1" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 disabled:opacity-40">
                        <Plus size={15} />
                      </button>
                    </div>
                    <span className="pr-1 text-[11px] font-medium text-slate-400">atur cepat:</span>
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-1.5">
                    {[-20, -10, -5, 5, 10, 20].map((d) => {
                      const kurang = d < 0;
                      const dis = busyId === r.id_produk || (kurang && r.stok + d < 0);
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={dis}
                          onClick={() => ubah(r, d)}
                          title={kurang ? `Kurangi ${-d}` : `Tambah ${d}`}
                          className={`tnum h-9 rounded-lg text-xs font-bold transition disabled:opacity-30 ${
                            kurang
                              ? "bg-white text-red-600 shadow-sm ring-1 ring-slate-200 hover:bg-red-50"
                              : "bg-emerald-700 text-white hover:bg-emerald-800"
                          }`}
                        >
                          {kurang ? `−${-d}` : `+${d}`}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">Selisih minus otomatis dicatat sebagai beban opname.</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
