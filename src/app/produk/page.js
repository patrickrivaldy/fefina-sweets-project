"use client";

import Image from "next/image";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import AddProductModal from "@/features/produk/components/AddProductModal";
import EditProductModal from "@/features/produk/components/EditProductModal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { supabase } from "@/config/supabase";
import { formatRupiah, randomId } from "@/utils/format";
import { STOK_KRITIS } from "@/constants/app";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  PackageSearch,
  TriangleAlert,
  TrendingUp,
  Boxes,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

const PER_PAGE = 10;

export default function ProdukPage() {
  const [search, setSearch] = useState("");
  const [pill, setPill] = useState("Semua");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [modalMap, setModalMap] = useState({});
  const [adaSku, setAdaSku] = useState(true); // kolom sku ada di db-draft.md terbaru
  const toastTimer = useRef(null);

  const showToast = (type, message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    const probe = await supabase.from("produk").select("sku").limit(1);
    const skuOk = !probe.error;
    setAdaSku(skuOk);
    const [p, v] = await Promise.all([
      supabase.from("produk").select(skuOk ? "*" : "id_produk, nama_produk, harga_jual, stok, foto, deskripsi, is_deleted").order("nama_produk", { ascending: true }),
      supabase.from("view_modal_produk").select("id_produk, modal_hpp_aktual"),
    ]);
    if (p.error) {
      setError("Data produk gagal dimuat.");
      setProducts([]);
    } else {
      setProducts(p.data || []);
      setError("");
    }
    const map = {};
    for (const row of v.data || []) map[row.id_produk] = Number(row.modal_hpp_aktual) || 0;
    setModalMap(map);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat halaman dibuka
    load();
  }, []);

  // Modal/HPP aktual dihitung dari resep × harga rata-rata bahan (view_modal_produk)
  const modalOf = (p) => modalMap[p.id_produk] || 0;

  const metrics = useMemo(() => {
    const active = products.filter((p) => !p.is_deleted);
    const asset = products.reduce((s, p) => s + modalOf(p) * (Number(p.stok) || 0), 0);
    const margins = products
      .filter((p) => !p.is_deleted && Number(p.harga_jual) > 0)
      .map((p) => ((Number(p.harga_jual) - modalOf(p)) / Number(p.harga_jual)) * 100);
    const avg = margins.length ? margins.reduce((s, m) => s + m, 0) / margins.length : 0;
    const critical = products.filter((p) => !p.is_deleted && Number(p.stok) <= STOK_KRITIS).length;
    return { total: products.length, active: active.length, asset, avg, critical };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, modalMap]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return products.filter((p) => {
      if (pill === "Aktif" && p.is_deleted) return false;
      if (pill === "Non-aktif" && !p.is_deleted) return false;
      if (pill === "Kritis" && !(!p.is_deleted && Number(p.stok) <= STOK_KRITIS)) return false;
      if (k && !p.nama_produk?.toLowerCase().includes(k) && !p.sku?.toLowerCase().includes(k) && !p.deskripsi?.toLowerCase().includes(k)) return false;
      return true;
    });
  }, [products, search, pill]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  // Nomor halaman berjendela: 1 … kini-1 kini kini+1 … akhir (hal. 6+ terjangkau).
  const pageNums = useMemo(() => {
    const s = new Set([1, pages, safePage - 1, safePage, safePage + 1]);
    return [...s].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  }, [pages, safePage]);

  const toggleAktif = async (p) => {
    const { error } = await supabase
      .from("produk")
      .update({ is_deleted: !p.is_deleted })
      .eq("id_produk", p.id_produk);
    if (error) showToast("error", "Gagal ubah status.");
    else {
      setProducts((prev) =>
        prev.map((x) => (x.id_produk === p.id_produk ? { ...x, is_deleted: !p.is_deleted } : x))
      );
      showToast("success", p.is_deleted ? "Produk ditampilkan lagi di kasir." : "Produk disembunyikan dari kasir.");
    }
  };

  const handleAdd = async (productData) => {
    setSubmitting(true);
    try {
      if (!adaSku) delete productData.sku;
      else if (productData.sku === "") productData.sku = null;
      const { data: inserted, error } = await supabase.from("produk").insert([productData]).select("id_produk").single();
      if (error) {
        const raw = error.message || "Produk gagal disimpan.";
        throw new Error(
          /duplicate|unique|already exists/i.test(raw)
            ? "Nama produk / SKU sudah dipakai produk lain."
            : /row-level security|policy/i.test(raw)
              ? "Ditolak database (RLS/policy). Pastikan sudah login dan user Auth punya akses."
              : raw
        );
      }
      // Stok awal dicatat sebagai batch produk biar HPP FIFO & struk jalan benar
      let hppAwal = 0;
      if (productData.stok > 0 && inserted?.id_produk) {
        const { data: v } = await supabase
          .from("view_modal_produk")
          .select("modal_hpp_aktual")
          .eq("id_produk", inserted.id_produk)
          .single();
        hppAwal = Number(v?.modal_hpp_aktual) || 0;
        await supabase.from("batch_produk").insert([{
          id_produk: inserted.id_produk,
          stok_sisa: productData.stok,
          hpp_produksi: hppAwal,
        }]);
      }
      await load();
      if (productData.stok > 0 && hppAwal === 0) {
        showToast("warn", "Produk tersimpan, tapi batch awal HPP-nya Rp 0 (resep belum ada). Tambahkan resep lalu Catat Produksi untuk HPP akurat.");
      } else {
        showToast("success", "Produk berhasil ditambahkan.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (productData) => {
    setSubmitting(true);
    try {
      const { id_produk, imageFile, ...updateData } = productData;
      if (!adaSku) delete updateData.sku;
      else if (updateData.sku === "") updateData.sku = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `products/${randomId()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("foto-produk")
          .upload(path, imageFile, { cacheControl: "3600", upsert: false, contentType: imageFile.type });
        if (upErr) {
          const raw = upErr.message || "Foto gagal diupload.";
          throw new Error(
            /bucket not found/i.test(raw)
              ? "Bucket foto 'foto-produk' belum dibuat di Supabase (Storage). Simpan tanpa ganti foto, atau buat bucketnya lalu coba lagi."
              : raw
          );
        }
        updateData.foto = supabase.storage.from("foto-produk").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("produk").update(updateData).eq("id_produk", id_produk);
      if (error) throw new Error(error.message);
      await load();
      setShowEdit(false);
      setSelected(null);
      showToast("success", "Produk berhasil diperbarui.");
    } catch (e) {
      showToast("error", e.message || "Produk gagal diperbarui.");
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Sembunyikan "${p.nama_produk}" dari kasir? (tidak tampil di POS)`)) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("produk").update({ is_deleted: true }).eq("id_produk", p.id_produk);
      if (error) throw new Error(error.message);
      await load();
      showToast("success", "Produk disembunyikan dari kasir.");
    } catch (e) {
      showToast("error", e.message || "Gagal menyembunyikan.");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    const head = "Nama;Modal;Harga Jual;Margin%;Stok;Tampil\n";
    const lines = filtered.map((p) => {
      const m = marginOf(p);
      return [`"${(p.nama_produk || "").replace(/"/g, "")}"`, modalOf(p), p.harga_jual, m.toFixed(1), p.stok, p.is_deleted ? "Tidak" : "Ya"].join(";");
    });
    const blob = new Blob(["\uFEFF" + head + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produk-fefina.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const marginOf = (p) => {
    if (!Number(p.harga_jual)) return 0;
    return ((Number(p.harga_jual) - modalOf(p)) / Number(p.harga_jual)) * 100;
  };
  const stokTone = (s) => (s === 0 ? "red" : s <= STOK_KRITIS ? "yellow" : "blue");

  return (
    <DashboardLayout>
      {toast && (
        <div className="fixed right-5 top-20 z-[100]">
          <div className={`flex min-w-[300px] items-center gap-2.5 rounded-xl px-4 py-3.5 shadow-lg ring-1 ${toast.type === "success" ? "bg-emerald-700 text-white ring-emerald-800" : toast.type === "warn" ? "bg-amber-500 text-white ring-amber-600" : "bg-red-600 text-white ring-red-700"}`}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <Check size={14} strokeWidth={3} />
            </span>
            <p className="flex-1 text-[13px] font-bold">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
          </div>
        </div>
      )}

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Katalog & Pergudangan UMKM
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold leading-8 tracking-tight sm:text-[28px]">
              Manajemen Produk & Stok
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Pantau HPP, margin, dan ketersediaan barang secara real-time.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} disabled={!filtered.length} className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-40">
              <Download size={16} /> Ekspor Excel
            </button>
            <button type="button" onClick={() => setShowAdd(true)} className="flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
              <Plus size={17} strokeWidth={2.5} /> Tambah Produk
            </button>
          </div>
        </div>

        {/* Metrik */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total SKU Terdaftar</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff4ff] text-emerald-700"><Boxes size={16} /></span>
            </div>
            <p className="tnum mt-2 break-words text-xl font-bold sm:text-[26px]">{loading ? "…" : metrics.total} <span className="text-sm font-semibold text-slate-400">SKU</span></p>
            <p className="mt-1.5 text-xs text-slate-500">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">{metrics.active} Aktif</span>{" "}
              {metrics.total - metrics.active} Non-aktif
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nilai Aset Stok (HPP)</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff4ff] text-emerald-700"><CircleDollarSign size={16} /></span>
            </div>
            <p className="tnum mt-2 break-words text-xl font-bold sm:text-[26px]">{loading ? "…" : formatRupiah(metrics.asset)}</p>
            <p className="mt-1.5 text-xs text-slate-500">Modal tertanam di gudang</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rata-rata Margin</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff4ff] text-emerald-700"><TrendingUp size={16} /></span>
            </div>
            <p className="tnum mt-2 break-words text-xl font-bold text-emerald-700 sm:text-[26px]">{loading ? "…" : `+${metrics.avg.toFixed(1)}%`}</p>
            <p className="mt-1.5 text-xs text-slate-500">Target sehat: &gt;30% <span className="font-bold text-emerald-700">• Sehat</span></p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Peringatan Stok</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500"><TriangleAlert size={16} /></span>
            </div>
            <p className="tnum mt-2 break-words text-xl font-bold text-red-600 sm:text-[26px]">{loading ? "…" : metrics.critical} <span className="text-sm font-semibold text-slate-400">item kritis</span></p>
            <p className="mt-1.5 text-xs font-bold text-red-600">Perlu restock segera</p>
          </div>
        </div>

        {/* Filter */}
        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-lg bg-[#eff4ff] px-3.5 focus-within:ring-2 focus-within:ring-emerald-600/25">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama produk, SKU, barcode, atau supplier..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              {[
                ["Semua", `Semua (${products.length})`],
                ["Aktif", `Aktif (${metrics.active})`],
                ["Non-aktif", `Non-aktif (${metrics.total - metrics.active})`],
                ["Kritis", `Stok Menipis & Habis (${metrics.critical})`],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setPill(v); setPage(1); }}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${pill === v ? "bg-emerald-700 text-white shadow-sm" : v === "Kritis" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#eff4ff] text-slate-600 hover:bg-slate-200"}`}
                >
                  {v === "Kritis" && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />}
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
          {loading ? (
            <p className="p-12 text-center text-sm text-slate-500">Memuat produk…</p>
          ) : error ? (
            <p className="p-12 text-center text-sm font-bold text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={<PackageSearch size={24} />} title="Tidak ada produk" message="Ubah filter atau tambah produk baru." />
          ) : (
            <>
              <div className="nice-scroll overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3 font-bold">Produk & Identitas</th>
                      <th className="px-4 py-3 text-right font-bold">HPP (Modal)</th>
                      <th className="px-4 py-3 text-right font-bold">Harga Jual</th>
                      <th className="px-4 py-3 text-right font-bold">Margin</th>
                      <th className="px-4 py-3 text-center font-bold">Stok</th>
                      <th className="px-4 py-3 text-center font-bold">Status Jual</th>
                      <th className="px-5 py-3 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const m = marginOf(p);
                      const s = Number(p.stok) || 0;
                      return (
                        <tr key={p.id_produk} className="h-14 border-t border-slate-100 hover:bg-slate-50/70">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                {p.foto ? (
                                  <Image src={p.foto} alt={p.nama_produk} width={44} height={44} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-lg font-extrabold text-slate-300">{p.nama_produk?.charAt(0)}</span>
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">{p.nama_produk}</span>
                                <span className="block max-w-[280px] truncate text-xs text-slate-400">{p.deskripsi || "Tanpa deskripsi"}</span>
                                {p.sku && <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">SKU: {p.sku}</span>}
                              </span>
                            </div>
                          </td>
                          <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-[13px] text-slate-600">
                            Rp {modalOf(p).toLocaleString("id-ID")}
                          </td>
                          <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-[13px] font-bold">
                            Rp {(+p.harga_jual || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`tnum rounded-full px-2 py-0.5 text-[11px] font-bold ${m >= 30 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              +{m.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge tone={stokTone(s)} dot={s > 0}>
                              {s} Pcs{s === 0 ? " (Habis)" : s <= STOK_KRITIS ? " (Menipis)" : ""}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleAktif(p)}
                              aria-label="Ubah status"
                              className={`relative inline-flex h-6 w-11 rounded-full transition ${p.is_deleted ? "bg-slate-300" : "bg-emerald-600"}`}
                            >
                              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.is_deleted ? "left-0.5" : "left-[22px]"}`} />
                            </button>
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => { setSelected(p); setShowEdit(true); }} aria-label="Ubah" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700">
                                <Pencil size={15} />
                              </button>
                              <button type="button" onClick={() => handleDelete(p)} aria-label="Nonaktifkan" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                <p>
                  Menampilkan {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} dari {filtered.length} produk
                </p>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Sebelumnya" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30">
                    <ChevronLeft size={15} />
                  </button>
                  {pageNums.map((n, i) => (
                    <span key={n} className="flex items-center gap-1">
                      {i > 0 && n - pageNums[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                      <button type="button" onClick={() => setPage(n)} className={`h-8 w-8 rounded-lg text-xs font-bold ${safePage === n ? "bg-emerald-700 text-white" : "hover:bg-slate-100"}`}>
                        {n}
                      </button>
                    </span>
                  ))}
                  <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} aria-label="Berikutnya" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AddProductModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} submitting={submitting} onToast={showToast} adaSku={adaSku} />
      <EditProductModal key={selected?.id_produk || "edit"} isOpen={showEdit} product={selected} onClose={() => { setShowEdit(false); setSelected(null); }} onSubmit={handleEdit} submitting={submitting} adaSku={adaSku} />
    </DashboardLayout>
  );
}
