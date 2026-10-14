"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, todayWIB, wibDateTime, wibMonth, formatKonversi } from "@/utils/format";
import { LIMITS } from "@/constants/app";
import { fetchModalMap } from "@/services/modal";
import { Factory, Plus, Trash2, Pencil, ChefHat, X, RotateCcw } from "lucide-react";

// Hasil 1 kuali per produk disimpan di browser (bukan database) sebagai default
// kalkulator, biar tidak ketik ulang tiap kali masak.
const readHasilKuali = (idProduk) => {
  try {
    return localStorage.getItem(`fefina-hasil-kuali:${idProduk}`) || "";
  } catch {
    return "";
  }
};
const saveHasilKuali = (idProduk, hasil) => {
  try {
    localStorage.setItem(`fefina-hasil-kuali:${idProduk}`, String(hasil));
  } catch { /* abaikan */ }
};

export default function ProduksiPage() {
  const [produk, setProduk] = useState([]);
  const [bahan, setBahan] = useState([]);
  const [resep, setResep] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [batch, setBatch] = useState([]);
  const [modalMap, setModalMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selId, setSelId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showResep, setShowResep] = useState(false);
  const [resepForm, setResepForm] = useState({ id_bahan: "", jumlah_terpakai: "" });
  const [editResep, setEditResep] = useState(null);
  const [kalk, setKalk] = useState({ takaran: "", hasil: "" }); // input mode kuali
  const [modeResep, setModeResep] = useState("pcs"); // pcs langsung | per 1 kuali
  const [modeMasak, setModeMasak] = useState("pcs"); // pcs langsung | per kuali
  const [kuali, setKuali] = useState({ count: "", hasil: "" });
  const resepBahan = bahan.find((x) => x.id_bahan === resepForm.id_bahan);
  const resepSatuan = resepBahan?.satuan || "";
  const [showProd, setShowProd] = useState(false);
  const [prodForm, setProdForm] = useState({ jumlah: "", tanggal_kadaluarsa: "", tanggal: todayWIB() });

  const load = async () => {
    setLoading(true);
    setLoadError("");
    const [p, b, r, w, t] = await Promise.all([
      supabase.from("produk").select("id_produk, nama_produk, stok, harga_jual").eq("is_deleted", false).order("nama_produk"),
      supabase.from("bahan_baku").select("id_bahan, nama_bahan, satuan, stok_bahan, harga_rata_rata").eq("is_deleted", false).order("nama_bahan"),
      supabase.from("resep_produk").select("*, bahan_baku(nama_bahan, satuan)"),
      supabase.from("riwayat_produksi").select("*, produk(nama_produk)").order("tanggal_produksi", { ascending: false }).limit(LIMITS.riwayatProduksi),
      supabase.from("batch_produk").select("*, produk(nama_produk)").gt("stok_sisa", 0).order("tanggal_produksi", { ascending: false }).limit(LIMITS.batchAktif),
    ]);
    const mmap = await fetchModalMap();
    const gagal = [p, b, r, w, t].find((x) => x.error);
    if (gagal) {
      const raw = gagal.error.message || "Gagal memuat data.";
      setLoadError(/row-level security|policy|JWT|auth/i.test(raw)
        ? "Database menolak akses (izin/ login). Pastikan sudah login dan query RLS di db-draft.md sudah dijalankan."
        : raw);
      setLoading(false);
      return;
    }
    if (!p.error) {
      const list = p.data || [];
      setProduk(list);
      // samakan dropdown: bila pilihan lama sudah tidak ada (dihapus), pindah ke produk pertama
      setSelId((s) => (list.some((x) => x.id_produk === s) ? s : list[0]?.id_produk || ""));
    }
    setBahan(b.data || []);
    setResep(r.data || []);
    setRiwayat(w.data || []);
    setBatch(t.data || []);
    setModalMap(mmap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selProduk = produk.find((x) => x.id_produk === selId);
  const resepSel = useMemo(() => resep.filter((x) => x.id_produk === selId), [resep, selId]);
  const batchSel = useMemo(() => batch.filter((x) => x.id_produk === selId), [batch, selId]);
  const modalSel = modalMap[selId] || 0;
  // pcs efektif untuk pratinjau: dari mode kuali (kuali × hasil) atau input pcs langsung
  const pcsEfektif = modeMasak === "kuali"
    ? (Number(kuali.count) > 0 && Number(kuali.hasil) > 0 ? Math.round(Number(kuali.count) * Number(kuali.hasil)) : 0)
    : (Number(prodForm.jumlah) || 0);

  const cukup = (jumlah) => {
    const out = [];
    for (const r of resepSel) {
      const b = bahan.find((x) => x.id_bahan === r.id_bahan);
      const butuh = Number(r.jumlah_terpakai) * jumlah;
      if ((Number(b?.stok_bahan) || 0) < butuh) out.push(`${b?.nama_bahan || "Bahan"}: butuh ${butuh.toLocaleString("id-ID")}, ada ${(Number(b?.stok_bahan) || 0).toLocaleString("id-ID")}`);
    }
    return out;
  };

  const simpanResep = async (e) => {
    e.preventDefault();
    setErr("");
    if (!selId) return setErr("Pilih produk dulu di dropdown atas.");
    if (!resepForm.id_bahan) return setErr("Pilih bahan.");
    if (bahan.length === 0) return setErr("Belum ada bahan baku. Tambah dulu di menu Bahan Baku.");
    // Mode kuali: takaran 1 kuali ÷ jadi berapa pcs. Mode pcs: takaran langsung.
    // Database selalu simpan per pcs agar HPP presisi; mode hanya cara input.
    let qty;
    if (modeResep === "kuali") {
      const t = Number(kalk.takaran);
      const h = Number(kalk.hasil);
      if (!t || t <= 0 || !h || h <= 0) return setErr("Isi takaran 1 kuali dan jadi berapa pcs (keduanya lebih dari 0).");
      qty = t / h;
      saveHasilKuali(selId, h);
    } else {
      qty = Number(resepForm.jumlah_terpakai);
      if (!qty || qty <= 0) return setErr("Takaran harus lebih dari 0.");
    }
    if (!editResep && resepSel.some((x) => x.id_bahan === resepForm.id_bahan)) return setErr("Bahan ini sudah ada di resep.");
    setBusy(true);
    try {
      if (editResep) {
        const { error } = await supabase.from("resep_produk").update({ jumlah_terpakai: qty }).eq("id_resep", editResep.id_resep);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("resep_produk").insert([{ id_produk: selId, id_bahan: resepForm.id_bahan, jumlah_terpakai: qty }]);
        if (error) throw new Error(error.message);
      }
      setShowResep(false); setEditResep(null); setResepForm({ id_bahan: "", jumlah_terpakai: "" }); setKalk({ takaran: "", hasil: "" });
      await load();
    } catch (e2) { setErr(e2.message || "Gagal menyimpan resep."); }
    finally { setBusy(false); }
  };

  const hapusResep = async (row) => {
    if (!window.confirm(`Hapus "${row.bahan_baku?.nama_bahan}" dari resep?`)) return;
    await supabase.from("resep_produk").delete().eq("id_resep", row.id_resep);
    await load();
  };

  const simpanProduksi = async (e) => {
    e.preventDefault();
    setErr("");
    if (!selProduk) return setErr("Pilih produk dulu.");
    if (resepSel.length === 0) return setErr("Produk ini belum punya resep. Tambah resep dulu.");
    // Mode kuali: jumlah kuali × hasil per kuali = pcs. Hasil per kuali diingat per produk.
    let pcs;
    if (modeMasak === "kuali") {
      const c = Number(kuali.count);
      const h = Number(kuali.hasil);
      if (!c || c <= 0 || !h || h <= 0) return setErr("Isi jumlah kuali dan hasil per kuali (keduanya lebih dari 0).");
      pcs = Math.round(c * h);
      saveHasilKuali(selId, h);
    } else {
      pcs = Number(prodForm.jumlah);
      if (!pcs || pcs <= 0) return setErr("Jumlah produksi harus lebih dari 0.");
      pcs = Math.round(pcs);
    }
    setBusy(true);
    try {
      // Trigger DB proses_produksi otomatis: kunci HPP + tambah stok/batch produk + potong bahan FIFO.
      const { error } = await supabase.from("riwayat_produksi").insert([{
        id_produk: selId,
        jumlah_produksi: pcs,
        tanggal_kadaluarsa: prodForm.tanggal_kadaluarsa || null,
        tanggal_produksi: prodForm.tanggal ? wibDateTime(prodForm.tanggal) : new Date().toISOString(),
      }]);
      if (error) throw new Error(error.message);
      setProdForm({ jumlah: "", tanggal_kadaluarsa: "", tanggal: todayWIB() });
      setKuali({ count: "", hasil: "" });
      setModeMasak("pcs");
      setShowProd(false);
      await load();
    } catch (e2) { setErr(e2.message || "Gagal mencatat produksi."); }
    finally { setBusy(false); }
  };

  const prodBulan = riwayat.filter((x) => wibMonth(x.tanggal_produksi) === todayWIB().slice(0, 7)).reduce((s, x) => s + (x.jumlah_produksi || 0), 0);

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          eyebrow="Dapur & Resep"
          title="Produksi"
          subtitle="Kelola resep, catat hasil masak — HPP dikunci otomatis per batch."
          action={
            <button type="button" onClick={() => { setErr(""); setModeMasak("pcs"); setKuali({ count: "", hasil: readHasilKuali(selId) }); setShowProd(true); }} disabled={!selId} className="flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-40">
              <ChefHat size={16} /> Catat Produksi
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Produk Beresep</p>
            <p className="tnum mt-1 break-words text-2xl font-bold">{loading ? "…" : new Set(resep.map((x) => x.id_produk)).size} <span className="text-sm font-semibold text-slate-400">/ {produk.length}</span></p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Produksi Bulan Ini</p>
            <p className="tnum mt-1 break-words text-2xl font-bold text-emerald-700">{loading ? "…" : prodBulan.toLocaleString("id-ID")} <span className="text-sm font-semibold text-slate-400">pcs</span></p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Batch Produk Aktif</p>
            <p className="tnum mt-1 break-words text-2xl font-bold">{loading ? "…" : batch.length}</p>
          </div>
        </div>

        {loadError && (
          <div className="rounded-xl bg-red-50 p-4 text-sm ring-1 ring-red-200">
            <p className="font-bold text-red-700">Gagal memuat data produksi</p>
            <p className="mt-0.5 text-[13px] text-red-600">{loadError}</p>
            <button type="button" onClick={load} className="mt-2.5 h-10 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700">
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !loadError && produk.length === 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
            <p className="text-sm font-bold">Belum ada produk — makanya tombol resep mati.</p>
            <p className="mt-0.5 text-[13px] text-slate-500">Resep itu takaran bahan <b>milik 1 produk</b>, jadi produknya harus ada dulu.</p>
            <Link href="/produk" className="mt-2.5 inline-flex h-11 items-center rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">
              <Plus size={15} /> Tambah Produk Dulu
            </Link>
          </div>
        )}

        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60">
          <div className="sm:max-w-md">
            <Select label="Pilih Produk" value={selId} onChange={(e) => setSelId(e.target.value)} variant="filter"
              placeholder={loading ? "Memuat…" : produk.length === 0 ? "Belum ada produk — tambah di menu Produk" : ""}>
              {produk.map((x) => <option key={x.id_produk} value={x.id_produk}>{x.nama_produk} (stok {x.stok})</option>)}
            </Select>
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-bold">Resep {selProduk?.nama_produk || ""}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Takaran bahan untuk bikin 1 pcs {selProduk?.nama_produk || "produk"} • Modal aktual <b className="tnum text-emerald-700">{formatRupiah(modalSel)}</b></p>
                <p className="mt-1 text-[11px] text-slate-400">Cara baca: &quot;2 kilogram untuk 1 pcs&quot; = untuk bikin 1 bungkus {selProduk?.nama_produk || "produk"} butuh 2 kg bahan.</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" onClick={load} disabled={loading} title="Muat ulang data" className="flex h-10 items-center gap-1.5 rounded-lg bg-[#eff4ff] px-3.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40">
                  <RotateCcw size={14} /> {loading ? "…" : "Refresh"}
                </button>
                <button type="button" onClick={() => { setEditResep(null); setResepForm({ id_bahan: "", jumlah_terpakai: "" }); setKalk({ takaran: "", hasil: "" }); setModeResep("pcs"); setErr(""); setShowResep(true); }} disabled={!selId} className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">
                  <Plus size={14} strokeWidth={2.5} /> Tambah Bahan
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {resepSel.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">Belum ada resep. Tambah bahan + takarannya.</p>}
              {resepSel.map((r) => (
                <div key={r.id_resep} className="flex items-center gap-3 rounded-lg bg-[#eff4ff]/70 px-3.5 py-2.5 ring-1 ring-slate-100">
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[13px] font-bold">{r.bahan_baku?.nama_bahan}</p>
                    {(() => {
                      const wb = bahan.find((x) => x.id_bahan === r.id_bahan);
                      const wac = Number(wb?.harga_rata_rata) || 0;
                      const lineModal = Number(r.jumlah_terpakai) * wac;
                      return (
                        <p className="tnum text-[11px] text-slate-500">
                          Butuh {Number(r.jumlah_terpakai).toLocaleString("id-ID")} {r.bahan_baku?.satuan}{formatKonversi(r.jumlah_terpakai, r.bahan_baku?.satuan) ? ` (${formatKonversi(r.jumlah_terpakai, r.bahan_baku?.satuan)})` : ""} untuk bikin 1 pcs
                          <span className="text-slate-400"> • modal bahan ini </span>
                          <b className="text-emerald-700">{formatRupiah(lineModal)}</b>
                          <span className="text-slate-400"> ({Number(r.jumlah_terpakai).toLocaleString("id-ID")} × {formatRupiah(wac)})</span>
                        </p>
                      );
                    })()}
                  </div>
                  <button type="button" onClick={() => { setEditResep(r); setResepForm({ id_bahan: r.id_bahan, jumlah_terpakai: String(r.jumlah_terpakai) }); setKalk({ takaran: "", hasil: "" }); setModeResep("pcs"); setErr(""); setShowResep(true); }} aria-label="Ubah" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-emerald-700"><Pencil size={14} /></button>
                  <button type="button" onClick={() => hapusResep(r)} aria-label="Hapus" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            {batchSel.length > 0 && (() => {
              const totalBatch = batchSel.reduce((s, b) => s + (b.stok_sisa || 0), 0);
              const stokMaster = selProduk?.stok ?? 0;
              const cocok = totalBatch === stokMaster;
              return (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Batch aktif produk ini</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">HPP tiap batch dikunci saat dibuat — tidak berubah walau resep/harga bahan berubah.</p>
                  <p className={`tnum mt-1.5 rounded-lg px-3 py-2 text-xs ring-1 ${cocok ? "bg-emerald-50/60 text-emerald-700 ring-emerald-100" : "bg-red-50 text-red-700 ring-red-200"}`}>
                    {cocok
                      ? `✓ Total batch ${totalBatch} pcs cocok stok master`
                      : `⚠ Total batch ${totalBatch} pcs vs stok master ${stokMaster} — selisih ${totalBatch - stokMaster}. Refresh dulu; bila tetap, ada ubah manual di konsinyasi.`}
                  </p>
                <ul className="mt-2 space-y-1.5">
                  {batchSel.slice(0, 5).map((b) => (
                    <li key={b.id_batch_produk} className="tnum flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-100">
                      <span className="font-bold">{b.stok_sisa} pcs • HPP terkunci {formatRupiah(b.hpp_produksi)}</span>
                      <span className="text-slate-500">{b.tanggal_kadaluarsa ? `exp ${formatTanggal(b.tanggal_kadaluarsa)}` : formatTanggal(b.tanggal_produksi)}</span>
                    </li>
                  ))}
                </ul>
                </div>
              );
            })()}
          </section>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="px-5 pb-1 pt-4">
              <h2 className="flex items-center gap-2 text-[15px] font-bold"><Factory size={16} className="text-emerald-700" /> Riwayat Produksi</h2>
              <p className="mt-0.5 text-xs text-slate-500">Log dapur — bahan terpotong otomatis (FIFO).</p>
            </div>
            <div className="nice-scroll max-h-[420px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50/95 text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur">
                  <tr><th className="px-5 py-2.5 font-bold">Tanggal</th><th className="px-3 py-2.5 font-bold">Produk</th><th className="px-3 py-2.5 text-right font-bold">Jumlah</th></tr>
                </thead>
                <tbody>
                  {riwayat.slice(0, 50).map((x) => (
                    <tr key={x.id_produksi} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-2.5 text-xs text-slate-500">{formatTanggal(x.tanggal_produksi, true)}</td>
                      <td className="px-3 py-2.5 text-[13px] font-bold">{x.produk?.nama_produk}</td>
                      <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-bold text-emerald-700">+{x.jumlah_produksi} pcs</td>
                    </tr>
                  ))}
                  {riwayat.length === 0 && !loading && <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-400">Belum ada produksi.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {showResep && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <form onSubmit={simpanResep} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-base font-bold">{editResep ? "Ubah Takaran" : "Tambah Bahan ke Resep"}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Untuk {selProduk?.nama_produk || "produk terpilih"} • takaran per 1 pcs</p>
            {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}
            {bahan.length === 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-[13px] font-semibold text-amber-800 ring-1 ring-amber-200">
                Belum ada bahan baku. Buka menu Bahan Baku → Tambah Bahan dulu, baru kembali ke sini.
              </p>
            )}
            <div className="mt-3 space-y-3">
              <Select label="Bahan *" value={resepForm.id_bahan} onChange={(e) => setResepForm({ ...resepForm, id_bahan: e.target.value })} disabled={busy || !!editResep}
                placeholder="Pilih bahan…">
                {bahan.map((x) => <option key={x.id_bahan} value={x.id_bahan}>{x.nama_bahan} ({x.satuan})</option>)}
              </Select>
              <div>
                <span className="mb-1.5 block text-[13px] font-bold">Isi takaran per</span>
                <div className="grid grid-cols-2 gap-2">
                  {[["pcs", "Per 1 pcs"], ["kuali", "Per 1 kuali"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => { setModeResep(v); if (v === "kuali") setKalk((k) => ({ ...k, hasil: k.hasil || readHasilKuali(selId) })); }} disabled={busy}
                      className={`h-11 rounded-lg text-[13px] font-bold ${modeResep === v ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {modeResep === "kuali" ? (
                <div className="rounded-xl bg-[#eff4ff]/70 p-3 ring-1 ring-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="mb-1 block text-[11px] font-bold text-slate-600">Takaran 1 kuali{resepSatuan ? ` (${resepSatuan})` : ""} *</label>
                      <input type="number" min="0" step="any" value={kalk.takaran} onChange={(e) => setKalk({ ...kalk, takaran: e.target.value })} disabled={busy} placeholder="1000" className="tnum h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-right text-sm font-bold outline-none focus:border-emerald-700" /></div>
                    <div><label className="mb-1 block text-[11px] font-bold text-slate-600">1 kuali jadi berapa pcs? *</label>
                      <input type="number" min="0" value={kalk.hasil} onChange={(e) => setKalk({ ...kalk, hasil: e.target.value })} disabled={busy} placeholder="10" className="tnum h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-right text-sm font-bold outline-none focus:border-emerald-700" /></div>
                  </div>
                  {Number(kalk.takaran) > 0 && Number(kalk.hasil) > 0 ? (
                    <p className="tnum mt-2 text-xs font-bold text-emerald-700">
                      → tersimpan {(Number(kalk.takaran) / Number(kalk.hasil)).toLocaleString("id-ID", { maximumFractionDigits: 4 })} {resepSatuan} per pcs
                      {formatKonversi(kalk.takaran, resepSatuan) ? <span className="font-medium text-slate-400"> (1 kuali {formatKonversi(kalk.takaran, resepSatuan)})</span> : null}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">Contoh: 1000 gram per kuali, jadi 10 pcs → tersimpan 100 gram per pcs.</p>
                  )}
                </div>
              ) : (
                <div><label className="mb-1.5 block text-[13px] font-bold">Takaran untuk 1 pcs produk{resepSatuan ? ` (dalam ${resepSatuan})` : ""} *</label>
                  <div className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 focus-within:border-emerald-700">
                    <input type="number" min="0" step="any" value={resepForm.jumlah_terpakai} onChange={(e) => setResepForm({ ...resepForm, jumlah_terpakai: e.target.value })} disabled={busy} placeholder="100" className="tnum w-full bg-transparent text-right text-sm font-bold outline-none" />
                    {resepSatuan && <span className="shrink-0 text-xs font-bold text-slate-400">{resepSatuan}</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {resepBahan
                      ? `Artinya: 1 pcs ${selProduk?.nama_produk || "produk"} butuh ${resepForm.jumlah_terpakai || "…"} ${resepSatuan}${formatKonversi(resepForm.jumlah_terpakai, resepSatuan) ? ` (${formatKonversi(resepForm.jumlah_terpakai, resepSatuan)})` : ""} ${resepBahan.nama_bahan}.`
                      : "Pilih bahan dulu — satuannya ngikut satuan bahan tersebut."}
                  </p></div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowResep(false)} disabled={busy} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">Batal</button>
              <button type="submit" disabled={busy || bahan.length === 0} className="h-12 flex-[2] rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{busy ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </form>
        </div>
      )}

      {showProd && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-slate-950/45" onClick={() => !busy && setShowProd(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h2 className="text-base font-bold">Catat Produksi</h2>
                <p className="text-xs text-slate-500">{selProduk?.nama_produk} • modal {formatRupiah(modalSel)}/pcs</p></div>
              <button type="button" onClick={() => !busy && setShowProd(false)} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={simpanProduksi} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 p-5">
                {err && <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}
                <div>
                  <span className="mb-1.5 block text-[13px] font-bold">Cara Hitung</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[["pcs", "Pcs langsung"], ["kuali", "Per kuali"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setModeMasak(v)} disabled={busy}
                        className={`h-11 rounded-lg text-[13px] font-bold ${modeMasak === v ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {modeMasak === "kuali" ? (
                  <div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div><label className="mb-1.5 block text-[13px] font-bold">Masak berapa kuali? *</label>
                        <input type="number" min="0" step="any" value={kuali.count} onChange={(e) => setKuali({ ...kuali, count: e.target.value })} disabled={busy} placeholder="1" autoFocus className="tnum h-12 w-full rounded-lg border border-slate-300 px-4 text-right text-base font-bold outline-none focus:border-emerald-700" /></div>
                      <div><label className="mb-1.5 block text-[13px] font-bold">1 kuali jadi berapa pcs? *</label>
                        <input type="number" min="0" value={kuali.hasil} onChange={(e) => setKuali({ ...kuali, hasil: e.target.value })} disabled={busy} placeholder="50" className="tnum h-12 w-full rounded-lg border border-slate-300 px-4 text-right text-base font-bold outline-none focus:border-emerald-700" /></div>
                    </div>
                    {Number(kuali.count) > 0 && Number(kuali.hasil) > 0 && (
                      <p className="tnum mt-2 rounded-lg bg-emerald-50/70 p-3 text-sm ring-1 ring-emerald-100">Hasil: <b className="text-emerald-700">{Math.round(Number(kuali.count) * Number(kuali.hasil)).toLocaleString("id-ID")} pcs {selProduk?.nama_produk}</b></p>
                    )}
                  </div>
                ) : (
                  <div><label className="mb-1.5 block text-[13px] font-bold">Jumlah Produksi (pcs {selProduk?.nama_produk || "produk"}) *</label>
                    <input type="number" min="1" value={prodForm.jumlah} onChange={(e) => setProdForm({ ...prodForm, jumlah: e.target.value })} disabled={busy} placeholder="20" autoFocus className="tnum h-12 w-full rounded-lg border border-slate-300 px-4 text-right text-base font-bold outline-none focus:border-emerald-700" /></div>
                )}
                {pcsEfektif > 0 && cukup(pcsEfektif).length > 0 && (
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                    <p className="font-bold">Stok bahan kurang (tetap bisa diproduksi, stok jadi minus):</p>
                    <ul className="mt-1 list-disc pl-4">{cukup(pcsEfektif).map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                )}
                {pcsEfektif > 0 && (
                  <p className="rounded-lg bg-emerald-50/70 p-3 text-sm ring-1 ring-emerald-100">Modal terkunci: <b className="tnum text-emerald-700">{formatRupiah(modalSel * pcsEfektif)}</b> <span className="text-slate-500">({formatRupiah(modalSel)} × {pcsEfektif.toLocaleString("id-ID")})</span></p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className="mb-1.5 block text-[13px] font-bold">Tanggal</label>
                    <input type="date" value={prodForm.tanggal} onChange={(e) => setProdForm({ ...prodForm, tanggal: e.target.value })} disabled={busy} className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" /></div>
                  <div><label className="mb-1.5 block text-[13px] font-bold">Kadaluarsa</label>
                    <input type="date" value={prodForm.tanggal_kadaluarsa} onChange={(e) => setProdForm({ ...prodForm, tanggal_kadaluarsa: e.target.value })} disabled={busy} className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" /></div>
                </div>
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-4">
                <button type="button" onClick={() => setShowProd(false)} disabled={busy} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">Batal</button>
                <button type="submit" disabled={busy} className="h-12 flex-[2] rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">{busy ? "Menyimpan…" : "Simpan Produksi"}</button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </DashboardLayout>
  );
}
