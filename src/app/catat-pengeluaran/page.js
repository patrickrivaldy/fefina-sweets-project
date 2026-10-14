"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import AddPengeluaranModal from "@/features/pengeluaran/components/AddPengeluaranModal";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, wibDateTime } from "@/utils/format";
import { Wallet, Trash2, Search, ArrowLeft, Check, Plus } from "lucide-react";

export default function CatatPengeluaranPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [adaKategori, setAdaKategori] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await supabase
      .from("pengeluaran_toko")
      .select("id_pengeluaran, tanggal, nominal, keterangan, kategori")
      .order("tanggal", { ascending: false })
      .limit(200);
    if (res.error && /column|kategori/i.test(res.error.message || "")) {
      setAdaKategori(false);
      const retry = await supabase
        .from("pengeluaran_toko")
        .select("id_pengeluaran, tanggal, nominal, keterangan")
        .order("tanggal", { ascending: false })
        .limit(200);
      if (retry.error) {
        setError("Gagal memuat pengeluaran.");
        setRows([]);
      } else setRows(retry.data || []);
    } else if (res.error) {
      setError("Gagal memuat pengeluaran.");
      setRows([]);
    } else setRows(res.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? rows.filter((x) => x.keterangan?.toLowerCase().includes(k) || (x.kategori || "").toLowerCase().includes(k)) : rows;
  }, [rows, q]);

  const totalTampil = filtered.reduce((s, x) => s + (+x.nominal || 0), 0);

  const simpan = async ({ keterangan, nominal, tanggal, kategori }) => {
    setOkMsg("");
    if (!keterangan?.trim()) throw new Error("Tulis keperluannya dulu.");
    const n = Number(nominal);
    if (!n || n <= 0) throw new Error("Nominal harus lebih dari 0.");
    setBusy(true);
    try {
      const payload = {
        keterangan: keterangan.trim(),
        nominal: n,
        tanggal: tanggal ? wibDateTime(tanggal) : new Date().toISOString(),
      };
      if (adaKategori) payload.kategori = kategori || "Lainnya";
      let ins = await supabase.from("pengeluaran_toko").insert([payload]);
      if (ins.error && adaKategori && /column|kategori/i.test(ins.error.message || "")) {
        delete payload.kategori;
        setAdaKategori(false);
        ins = await supabase.from("pengeluaran_toko").insert([payload]);
      }
      if (ins.error) throw new Error(ins.error.message);
      setOkMsg(`Tersimpan: keluar ${formatRupiah(n)}.`);
      setShowAdd(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const hapus = async (r) => {
    if (!window.confirm(`Hapus "${r.keterangan}" (${formatRupiah(r.nominal)})?`)) return;
    await supabase.from("pengeluaran_toko").delete().eq("id_pengeluaran", r.id_pengeluaran);
    await load();
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          eyebrow="Kas Keluar"
          title="Pencatatan Pengeluaran"
          subtitle="Catat tiap uang keluar selain kulakan bahan. Ringkasannya ada di Keuangan."
          action={
            <div className="flex gap-2">
              <Link href="/pengeluaran" className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                <ArrowLeft size={16} /> Ringkasan
              </Link>
              <button type="button" onClick={() => { setOkMsg(""); setShowAdd(true); }} className="flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
                <Plus size={16} /> Catat Pengeluaran
              </button>
            </div>
          }
        />

        {okMsg && (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-[13px] font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100">
            <Check size={15} strokeWidth={3} /> {okMsg}
          </p>
        )}

        <div className="grid items-start gap-4">
          {/* Daftar */}
          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="px-5 pb-1 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[15px] font-bold"><Wallet size={16} className="text-red-500" /> Terakhir Dicatat</h2>
                <span className="rounded-full bg-[#eff4ff] px-2.5 py-1 text-[11px] font-bold text-slate-600">{filtered.length} Entri</span>
              </div>
              <label className="mt-2.5 flex h-11 items-center gap-2 rounded-lg bg-[#eff4ff] px-3.5 focus-within:ring-2 focus-within:ring-emerald-600/25">
                <Search size={15} className="shrink-0 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari keterangan / kategori…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              {filtered.length > 0 && (
                <p className="tnum mt-2 text-xs text-slate-500">Total tampil: <b className="text-red-600">- {formatRupiah(totalTampil)}</b></p>
              )}
            </div>
            <div className="nice-scroll max-h-[520px] overflow-y-auto">
              {loading ? (
                <p className="p-10 text-center text-sm text-slate-400">Memuat…</p>
              ) : error ? (
                <div className="p-4"><EmptyState icon={<Wallet size={24} />} title="Gagal" message={error} /></div>
              ) : filtered.length === 0 ? (
                <div className="p-4"><EmptyState icon={<Wallet size={24} />} title="Kosong" message={q ? "Tidak ada yang cocok." : "Belum ada pengeluaran tercatat."} /></div>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50/95 text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur">
                    <tr>
                      <th className="px-5 py-2.5 font-bold">Keterangan</th>
                      <th className="px-3 py-2.5 font-bold">Tanggal</th>
                      <th className="px-3 py-2.5 text-right font-bold">Nominal</th>
                      <th className="px-4 py-2.5 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id_pengeluaran} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500"><Wallet size={15} /></span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-bold leading-tight">{r.keterangan}</span>
                              {adaKategori && r.kategori && <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{r.kategori}</span>}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{formatTanggal(r.tanggal)}</td>
                        <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-bold text-red-600">- {formatRupiah(r.nominal)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button type="button" onClick={() => hapus(r)} aria-label="Hapus" className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </section>
        </div>
      </div>

      <AddPengeluaranModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSubmit={simpan} submitting={busy} adaKategori={adaKategori} />
    </DashboardLayout>
  );
}
