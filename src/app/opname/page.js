"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, todayWIB, pesanErrorDb } from "@/utils/format";
import { LIMITS } from "@/constants/app";
import { ClipboardList, Plus, X } from "lucide-react";

export default function OpnamePage() {
  const [rows, setRows] = useState([]);
  const [produk, setProduk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id_produk: "", stok_fisik: "", keterangan: "", alasan: "Hilang" });

  const load = async () => {
    setLoading(true);
    const [o, p] = await Promise.all([
      supabase.from("penyesuaian_stok").select("*, produk(nama_produk)").order("tanggal", { ascending: false }).limit(LIMITS.opname),
      supabase.from("produk").select("id_produk, nama_produk, stok").eq("is_deleted", false).order("nama_produk"),
    ]);
    if (!o.error) setRows(o.data || []);
    if (!p.error) setProduk(p.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? rows.filter((x) => x.produk?.nama_produk?.toLowerCase().includes(k) || x.keterangan?.toLowerCase().includes(k)) : rows;
  }, [rows, q]);

  const susut = rows.filter((x) => (x.selisih || 0) < 0).reduce((s, x) => s + Math.abs(x.selisih || 0), 0);
  const surplus = rows.filter((x) => (x.selisih || 0) > 0).reduce((s, x) => s + (x.selisih || 0), 0);
  const selProduk = produk.find((x) => x.id_produk === form.id_produk);
  const selisihPreview = form.stok_fisik !== "" && selProduk ? Number(form.stok_fisik) - selProduk.stok : null;

  const simpan = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.id_produk) return setErr("Pilih produk.");
    if (form.stok_fisik === "" || Number(form.stok_fisik) < 0) return setErr("Stok fisik tidak valid.");
    if (!form.keterangan.trim()) return setErr("Tulis keterangan (misal: opname mingguan).");
    setBusy(true);
    try {
      // Trigger DB proses_penyesuaian_stok otomatis: isi stok_sistem+selisih,
      // update produk & batch FIFO, catat rugi ke pengeluaran_toko bila minus.
      // Awalan "Rusak:"/"Kadaluarsa:" dibaca trigger untuk kategori bebannya.
      const ket = form.alasan === "Hilang"
        ? form.keterangan.trim()
        : `${form.alasan}: ${form.keterangan.trim()}`;
      const { error } = await supabase.from("penyesuaian_stok").insert([{
        id_produk: form.id_produk,
        stok_fisik: Number(form.stok_fisik),
        keterangan: ket,
      }]);
      if (error) throw new Error(error.message);
      setForm({ id_produk: "", stok_fisik: "", keterangan: "", alasan: "Hilang" });
      setShowForm(false);
      await load();
    } catch (e2) { setErr(pesanErrorDb(e2.message)); }
    finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          eyebrow="Audit Stok"
          title="Stock Opname"
          subtitle="Selisih minus otomatis dicatat sebagai beban operasional."
          action={
            <button type="button" onClick={() => { setErr(""); setShowForm(true); }} className="flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
              <Plus size={16} /> Opname Baru
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Opname</p>
            <p className="tnum mt-1 break-words text-2xl font-bold">{loading ? "…" : rows.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Susut (Minus)</p>
            <p className="tnum mt-1 break-words text-2xl font-bold text-red-600">{loading ? "…" : susut.toLocaleString("id-ID")} <span className="text-sm font-semibold text-slate-400">pcs</span></p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Surplus (Plus)</p>
            <p className="tnum mt-1 break-words text-2xl font-bold text-emerald-700">{loading ? "…" : surplus.toLocaleString("id-ID")} <span className="text-sm font-semibold text-slate-400">pcs</span></p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk / keterangan…" className="h-11 w-full rounded-lg bg-[#eff4ff] px-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/25 sm:max-w-sm" />
        </div>

        {loading ? <p className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Memuat…</p>
        : filtered.length === 0 ? <EmptyState icon={<ClipboardList size={24} />} title="Kosong" message="Belum ada riwayat opname." />
        : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
            <div className="nice-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead><tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-bold">Tanggal</th><th className="px-4 py-3 font-bold">Produk</th>
                  <th className="px-4 py-3 text-right font-bold">Sistem</th><th className="px-4 py-3 text-right font-bold">Fisik</th>
                  <th className="px-4 py-3 text-right font-bold">Selisih</th><th className="px-5 py-3 font-bold">Keterangan</th>
                </tr></thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr key={x.id_penyesuaian} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-2.5 text-xs text-slate-500">{formatTanggal(x.tanggal, true)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold">{x.produk?.nama_produk}</td>
                      <td className="tnum px-4 py-2.5 text-right text-[13px] text-slate-500">{x.stok_sistem}</td>
                      <td className="tnum px-4 py-2.5 text-right text-[13px] font-bold">{x.stok_fisik}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge tone={(x.selisih || 0) < 0 ? "red" : (x.selisih || 0) > 0 ? "green" : "gray"} dot={false}>
                          {(x.selisih || 0) > 0 ? `+${x.selisih}` : `${x.selisih || 0}`}
                        </Badge>
                      </td>
                      <td className="max-w-[260px] truncate px-5 py-2.5 text-xs text-slate-500">{x.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-slate-950/45" onClick={() => !busy && setShowForm(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h2 className="text-base font-bold">Opname Baru</h2>
                <p className="text-xs text-slate-500">Bandingkan stok sistem vs fisik.</p></div>
              <button type="button" onClick={() => !busy && setShowForm(false)} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={simpan} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 p-5">
                {err && <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}
                <Select label="Produk *" value={form.id_produk} onChange={(e) => setForm({ ...form, id_produk: e.target.value })} disabled={busy}
                  placeholder="Pilih produk…">
                  {produk.map((x) => <option key={x.id_produk} value={x.id_produk}>{x.nama_produk} (sistem: {x.stok})</option>)}
                </Select>
                {selProduk && <p className="rounded-lg bg-[#eff4ff] p-3 text-sm">Stok sistem: <b className="tnum">{selProduk.stok} pcs</b></p>}
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold">Alasan selisih</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[["Hilang", "Hilang / selisih"], ["Rusak", "Rusak / basi"], ["Kadaluarsa", "Kadaluarsa"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setForm({ ...form, alasan: v })} disabled={busy}
                        className={`h-11 rounded-lg text-[13px] font-bold ${form.alasan === v ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Rusak/basi & kadaluarsa otomatis masuk beban kerugian.</p>
                </div>
                <div><label className="mb-1.5 block text-[13px] font-bold">Stok Fisik (hasil hitung) *</label>
                  <input type="number" min="0" value={form.stok_fisik} onChange={(e) => setForm({ ...form, stok_fisik: e.target.value })} disabled={busy} placeholder="0" autoFocus className="tnum h-12 w-full rounded-lg border border-slate-300 px-4 text-right text-base font-bold outline-none focus:border-emerald-700" /></div>
                {selisihPreview !== null && (
                  <p className={`rounded-lg p-3 text-sm ring-1 ${selisihPreview < 0 ? "bg-red-50 text-red-700 ring-red-100" : selisihPreview > 0 ? "bg-emerald-50/70 text-emerald-700 ring-emerald-100" : "bg-slate-50 text-slate-500 ring-slate-200"}`}>
                    Selisih: <b className="tnum">{selisihPreview > 0 ? `+${selisihPreview}` : selisihPreview} pcs</b>
                    {selisihPreview < 0 && " — akan dicatat sebagai beban opname."}
                  </p>
                )}
                <div><label className="mb-1.5 block text-[13px] font-bold">Keterangan *</label>
                  <input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} disabled={busy} placeholder="Opname mingguan etalase" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" /></div>
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-4">
                <button type="button" onClick={() => setShowForm(false)} disabled={busy} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">Batal</button>
                <button type="submit" disabled={busy} className="h-12 flex-[2] rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">{busy ? "Menyimpan…" : "Simpan Opname"}</button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </DashboardLayout>
  );
}
