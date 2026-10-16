"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, todayWIB, wibDateTime, formatKonversi, formatStok } from "@/utils/format";
import { SATUAN_BAHAN, LIMITS } from "@/constants/app";
import RupiahInput from "@/components/ui/RupiahInput";
import { Wheat, Plus, Pencil, Trash2, ShoppingCart, History, X } from "lucide-react";

export default function BahanPage() {
  const [bahan, setBahan] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [batch, setBatch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("bahan");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama_bahan: "", satuan: "" });
  const [showBeli, setShowBeli] = useState(false);
  const [beli, setBeli] = useState({ id_bahan: "", jumlah_beli: "", total_biaya: "", tanggal_kadaluarsa: "", tanggal_beli: todayWIB(), id_supplier: "" });
  const [suppliers, setSuppliers] = useState([]);
  const [adaSupplier, setAdaSupplier] = useState(true);
  const [supBaru, setSupBaru] = useState("");
  const [showSupBaru, setShowSupBaru] = useState(false);
  const [expandId, setExpandId] = useState(null);

  const load = async () => {
    setLoading(true);
    const [b, r, t, s] = await Promise.all([
      supabase.from("bahan_baku").select("*").eq("is_deleted", false).order("nama_bahan"),
      supabase.from("riwayat_beli_bahan").select("*, bahan_baku(nama_bahan, satuan), supplier(nama_supplier)").order("tanggal_beli", { ascending: false }).limit(LIMITS.riwayatBeli),
      supabase.from("batch_bahan_baku").select("*, bahan_baku(nama_bahan)").gt("stok_sisa", 0).order("tanggal_kadaluarsa", { ascending: true, nullsFirst: false }).limit(LIMITS.batchAktif),
      supabase.from("supplier").select("id_supplier, nama_supplier").eq("is_deleted", false).order("nama_supplier"),
    ]);
    if (!b.error) setBahan(b.data || []);
    if (!r.error) setRiwayat(r.data || []);
    else if (/column|supplier/i.test(r.error.message || "")) {
      // db-draft.md BAGIAN 2 belum dijalankan penuh → muat riwayat tanpa supplier
      setAdaSupplier(false);
      const retry = await supabase.from("riwayat_beli_bahan").select("*, bahan_baku(nama_bahan, satuan)").order("tanggal_beli", { ascending: false }).limit(LIMITS.riwayatBeli);
      if (!retry.error) setRiwayat(retry.data || []);
    }
    if (!t.error) setBatch(t.data || []);
    if (!s.error) setSuppliers(s.data || []);
    else setAdaSupplier(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? bahan.filter((x) => x.nama_bahan?.toLowerCase().includes(k)) : bahan;
  }, [bahan, q]);

  const nilaiStok = bahan.reduce((s, x) => s + (Number(x.stok_bahan) || 0) * (Number(x.harga_rata_rata) || 0), 0);

  const openAdd = () => { setEditing(null); setForm({ nama_bahan: "", satuan: "" }); setErr(""); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setForm({ nama_bahan: row.nama_bahan, satuan: row.satuan }); setErr(""); setShowForm(true); };

  const simpanBahan = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.nama_bahan.trim()) return setErr("Nama bahan wajib diisi.");
    if (!form.satuan.trim()) return setErr("Satuan wajib diisi — ketik atau pilih saran (gram, kg, ml, liter, pcs, pack, sachet, butir).");
    setBusy(true);
    try {
      if (editing) {
        const { error } = await supabase.from("bahan_baku").update({ nama_bahan: form.nama_bahan.trim(), satuan: form.satuan.trim() }).eq("id_bahan", editing.id_bahan);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("bahan_baku").insert([{ nama_bahan: form.nama_bahan.trim(), satuan: form.satuan.trim(), stok_bahan: 0, harga_rata_rata: 0, is_deleted: false }]);
        if (error) throw new Error(error.message);
      }
      setShowForm(false);
      await load();
    } catch (e2) { setErr(e2.message || "Gagal menyimpan."); }
    finally { setBusy(false); }
  };

  const hapusBahan = async (row) => {
    if (!window.confirm(`Nonaktifkan "${row.nama_bahan}"?`)) return;
    await supabase.from("bahan_baku").update({ is_deleted: true }).eq("id_bahan", row.id_bahan);
    await load();
  };

  const simpanBeli = async (e) => {
    e.preventDefault();
    setErr("");
    const qty = Number(beli.jumlah_beli);
    const biaya = Number(beli.total_biaya);
    if (!beli.id_bahan) return setErr("Pilih bahan dulu.");
    if (!qty || qty <= 0) return setErr("Jumlah beli harus lebih dari 0.");
    if (!biaya || biaya < 0) return setErr("Total biaya tidak valid.");
    setBusy(true);
    try {
      // Trigger DB proses_beli_bahan_baku otomatis: tambah stok + hitung WAC + buat batch FIFO.
      const payload = {
        id_bahan: beli.id_bahan,
        jumlah_beli: qty,
        total_biaya: Math.round(biaya),
        tanggal_kadaluarsa: beli.tanggal_kadaluarsa || null,
        tanggal_beli: beli.tanggal_beli ? wibDateTime(beli.tanggal_beli) : new Date().toISOString(),
      };
      if (adaSupplier && beli.id_supplier) payload.id_supplier = beli.id_supplier;
      let ins = await supabase.from("riwayat_beli_bahan").insert([payload]);
      if (ins.error && /column|supplier/i.test(ins.error.message || "")) {
        delete payload.id_supplier;
        setAdaSupplier(false);
        ins = await supabase.from("riwayat_beli_bahan").insert([payload]);
      }
      if (ins.error) throw new Error(ins.error.message);
      setBeli({ id_bahan: "", jumlah_beli: "", total_biaya: "", tanggal_kadaluarsa: "", tanggal_beli: todayWIB(), id_supplier: "" });
      setShowBeli(false);
      await load();
    } catch (e2) { setErr(e2.message || "Gagal menyimpan pembelian."); }
    finally { setBusy(false); }
  };

  const tambahSupplier = async () => {
    const nama = supBaru.trim();
    if (!nama || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from("supplier").insert([{ nama_supplier: nama }]).select("id_supplier, nama_supplier").single();
      if (error) throw new Error(error.message);
      setSuppliers((prev) => [...prev, data].sort((a, b) => a.nama_supplier.localeCompare(b.nama_supplier)));
      setBeli({ ...beli, id_supplier: data.id_supplier });
      setSupBaru("");
      setShowSupBaru(false);
    } catch (e2) { setErr(e2.message || "Gagal menambah supplier."); }
    finally { setBusy(false); }
  };

  const batchOf = (id) => batch.filter((x) => x.id_bahan === id);
  const beliBahan = bahan.find((x) => x.id_bahan === beli.id_bahan);
  const beliSatuan = beliBahan?.satuan || "";

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          eyebrow="Gudang & Kulakan"
          title="Bahan Baku"
          subtitle="Stok dan harga rata-rata (WAC) dihitung otomatis tiap ada pembelian."
          action={
            <div className="flex gap-2">
              <button type="button" onClick={() => { setErr(""); setShowBeli(true); }} className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                <ShoppingCart size={16} /> Catat Pembelian
              </button>
              <button type="button" onClick={openAdd} className="flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
                <Plus size={16} /> Tambah Bahan
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Macam Bahan</p>
            <p className="tnum mt-1 break-words text-2xl font-bold">{loading ? "…" : bahan.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nilai Persediaan</p>
            <p className="tnum mt-1 break-words text-2xl font-bold text-emerald-700">{loading ? "…" : formatRupiah(Math.round(nilaiStok))}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-400">Stok saat ini × WAC. Turun saat dipakai produksi = pindah jadi modal produk, bukan hilang.</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Batch Aktif (FIFO)</p>
            <p className="tnum mt-1 break-words text-2xl font-bold">{loading ? "…" : batch.length}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            {[["bahan", "Bahan Baku", bahan.length], ["beli", "Riwayat Beli", riwayat.length]].map(([v, l, n]) => (
              <button key={v} type="button" onClick={() => setTab(v)} className={`flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-bold ${tab === v ? "bg-emerald-700 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
                {v === "bahan" ? <Wheat size={15} /> : <History size={15} />} {l}
                <span className={`rounded-full px-1.5 text-[11px] ${tab === v ? "bg-white/20" : "bg-slate-100"}`}>{n}</span>
              </button>
            ))}
            <label className="ml-auto flex h-10 min-w-[200px] flex-1 items-center rounded-lg bg-[#eff4ff] px-3 focus-within:ring-2 focus-within:ring-emerald-600/25 sm:max-w-xs">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari bahan…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
          </div>
        </div>

        {tab === "bahan" ? (
          loading ? <p className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Memuat…</p>
          : filtered.length === 0 ? <EmptyState icon={<Wheat size={24} />} title="Kosong" message="Belum ada bahan baku. Tambah dulu." />
          : (
            <div className="grid items-start gap-3 lg:grid-cols-2">
              {filtered.map((x) => {
                const bs = batchOf(x.id_bahan);
                const totalBatch = bs.reduce((s, b) => s + Number(b.stok_sisa), 0);
                const drift = Number(x.stok_bahan) - totalBatch;
                const open = expandId === x.id_bahan;
                return (
                  <article key={x.id_bahan} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Wheat size={20} /></span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-bold">{x.nama_bahan}</p>
                        <p className="tnum text-xs text-slate-500">{formatStok(x.stok_bahan)} {x.satuan} • WAC {formatRupiah(x.harga_rata_rata)}/{x.satuan}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openEdit(x)} aria-label="Ubah" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                        <button type="button" onClick={() => hapusBahan(x)} aria-label="Hapus" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <button type="button" onClick={() => setExpandId(open ? null : x.id_bahan)} className="mt-2.5 w-full rounded-lg bg-[#eff4ff] px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-200">
                      {open ? "Tutup batch" : `Lihat ${bs.length} batch FIFO`} {bs.length > 0 && <span className="font-medium text-slate-400">• sisa {formatStok(bs.reduce((s, b) => s + Number(b.stok_sisa), 0))} {x.satuan}</span>}
                    </button>
                    {open && (
                      <ul className="mt-2 space-y-1.5">
                        <li className="tnum flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-100">
                          <span className="font-bold text-slate-600">Total batch: {formatStok(totalBatch)} {x.satuan}</span>
                          <span className={Math.abs(drift) < 0.01 ? "font-bold text-emerald-700" : "font-bold text-red-600"}>
                            {Math.abs(drift) < 0.01 ? "✓ cocok stok master" : `⚠ selisih ${formatStok(drift)} vs master`}
                          </span>
                        </li>
                        {bs.length === 0 && <li className="text-xs text-slate-400">Tidak ada batch aktif.</li>}
                        {bs.map((b) => (
                          <li key={b.id_batch_bahan} className="tnum flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-100">
                            <span className="font-bold">{formatStok(b.stok_sisa)} {x.satuan}</span>
                            <span className="text-slate-500">masuk {formatTanggal(b.tanggal_masuk)} {b.tanggal_kadaluarsa ? `• exp ${formatTanggal(b.tanggal_kadaluarsa)}` : "• tanpa exp"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          )
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
              <div>
                <h2 className="text-[15px] font-bold">Total Modal Kulakan</h2>
                <p className="text-xs text-slate-500">{riwayat.length} pembelian • harga & batch otomatis per pembelian</p>
              </div>
              <p className="tnum text-xl font-bold text-emerald-700">{formatRupiah(riwayat.reduce((s, r) => s + (+r.total_biaya || 0), 0))}</p>
            </div>
            <div className="nice-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead><tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-bold">Tanggal</th><th className="px-4 py-3 font-bold">Bahan</th>
                  {adaSupplier && <th className="px-4 py-3 font-bold">Supplier</th>}
                  <th className="px-4 py-3 text-right font-bold">Jumlah</th><th className="px-4 py-3 text-right font-bold">Total Biaya</th>
                  <th className="px-5 py-3 text-right font-bold">Kadaluarsa</th>
                </tr></thead>
                <tbody>
                  {riwayat.map((r) => (
                    <tr key={r.id_pembelian} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-2.5 text-xs text-slate-500">{formatTanggal(r.tanggal_beli, true)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold">{r.bahan_baku?.nama_bahan}</td>
                      {adaSupplier && <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{r.supplier?.nama_supplier || "-"}</td>}
                      <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-[13px]">{formatStok(r.jumlah_beli)} {r.bahan_baku?.satuan}</td>
                      <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-[13px] font-bold text-emerald-700">{formatRupiah(r.total_biaya)}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right text-xs text-slate-500">{r.tanggal_kadaluarsa ? formatTanggal(r.tanggal_kadaluarsa) : "-"}</td>
                    </tr>
                  ))}
                  {riwayat.length === 0 && !loading && <tr><td colSpan={adaSupplier ? 6 : 5} className="px-5 py-10 text-center text-sm text-slate-400">Belum ada pembelian.</td></tr>}
                  {riwayat.length > 0 && (
                    <tr className="border-t-2 border-slate-200 bg-slate-50/70 text-sm font-bold">
                      <td colSpan={adaSupplier ? 4 : 3} className="px-5 py-3">TOTAL</td>
                      <td className="tnum whitespace-nowrap px-4 py-3 text-right text-emerald-700">{formatRupiah(riwayat.reduce((s, r) => s + (+r.total_biaya || 0), 0))}</td>
                      <td className="px-5 py-3" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <form onSubmit={simpanBahan} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-base font-bold">{editing ? "Ubah Bahan" : "Tambah Bahan"}</h2>
            <p className="text-xs text-slate-500">Stok awal 0 — stok bertambah lewat menu Catat Pembelian.</p>
            {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}
            <div className="mt-3 space-y-3">
              <div><label className="mb-1.5 block text-[13px] font-bold">Nama Bahan *</label>
                <input value={form.nama_bahan} onChange={(e) => setForm({ ...form, nama_bahan: e.target.value })} disabled={busy} placeholder="Tepung terigu" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" /></div>
              <div><label className="mb-1.5 block text-[13px] font-bold">Satuan *</label>
                <input value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} disabled={busy} placeholder="Ketik satuan…" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SATUAN_BAHAN.map((s) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, satuan: s })} disabled={busy}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${form.satuan === s ? "bg-emerald-700 text-white shadow-sm" : "bg-[#eff4ff] text-slate-600 hover:bg-slate-200"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Ketuk saran atau ketik sendiri. Disarankan gram/ml agar konsisten.</p></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} disabled={busy} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">Batal</button>
              <button type="submit" disabled={busy} className="h-12 flex-[2] rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">{busy ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </form>
        </div>
      )}

      {showBeli && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-slate-950/45" onClick={() => !busy && setShowBeli(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h2 className="text-base font-bold">Catat Pembelian Bahan</h2>
                <p className="text-xs text-slate-500">Trigger DB otomatis hitung WAC + buat batch FIFO.</p></div>
              <button type="button" onClick={() => !busy && setShowBeli(false)} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={simpanBeli} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 p-5">
                {err && <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}
                <Select label="Bahan *" value={beli.id_bahan} onChange={(e) => setBeli({ ...beli, id_bahan: e.target.value })} disabled={busy}
                  placeholder="Pilih bahan…">
                  {bahan.map((x) => <option key={x.id_bahan} value={x.id_bahan}>{x.nama_bahan} (stok {formatStok(x.stok_bahan)} {x.satuan})</option>)}
                </Select>
                {adaSupplier && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-[13px] font-bold">Supplier <span className="font-medium text-slate-400">(opsional)</span></label>
                      <button type="button" onClick={() => setShowSupBaru((v) => !v)} disabled={busy} className="text-xs font-bold text-emerald-700 hover:underline">
                        {showSupBaru ? "Tutup" : "+ Baru"}
                      </button>
                    </div>
                    {showSupBaru ? (
                      <div className="flex gap-2">
                        <input value={supBaru} onChange={(e) => setSupBaru(e.target.value)} disabled={busy} placeholder="Nama supplier…" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" />
                        <button type="button" onClick={tambahSupplier} disabled={busy || !supBaru.trim()} className="h-11 shrink-0 rounded-lg bg-emerald-700 px-4 text-[13px] font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                          Tambah
                        </button>
                      </div>
                    ) : (
                      <Select value={beli.id_supplier} onChange={(e) => setBeli({ ...beli, id_supplier: e.target.value })} disabled={busy} placeholder="Pilih supplier…">
                        {suppliers.map((s) => <option key={s.id_supplier} value={s.id_supplier}>{s.nama_supplier}</option>)}
                      </Select>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className="mb-1.5 block text-[13px] font-bold">Jumlah{beliSatuan ? ` (${beliSatuan})` : ""} *</label>
                    <div className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 focus-within:border-emerald-700">
                      <input type="number" min="0" step="any" value={beli.jumlah_beli} onChange={(e) => setBeli({ ...beli, jumlah_beli: e.target.value })} disabled={busy} placeholder="1000" className="tnum w-full bg-transparent text-right text-sm font-bold outline-none" />
                      {beliSatuan && <span className="shrink-0 text-xs font-bold text-slate-400">{beliSatuan}</span>}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Dalam satuan bahan{beliSatuan ? `: ${beliSatuan}` : " (pilih bahan dulu)"}{formatKonversi(beli.jumlah_beli, beliSatuan) ? ` ${formatKonversi(beli.jumlah_beli, beliSatuan)}` : ""}.</p></div>
                  <div><label className="mb-1.5 block text-[13px] font-bold">Total Biaya (Rp) *</label>
                    <RupiahInput value={beli.total_biaya} onChange={(v) => setBeli({ ...beli, total_biaya: v })} disabled={busy} placeholder="50.000" className="tnum h-11 w-full rounded-lg border border-slate-300 px-3.5 text-right text-sm font-bold outline-none placeholder:text-slate-400 focus:border-emerald-700" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className="mb-1.5 block text-[13px] font-bold">Tgl Beli</label>
                    <input type="date" value={beli.tanggal_beli} onChange={(e) => setBeli({ ...beli, tanggal_beli: e.target.value })} disabled={busy} className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" /></div>
                  <div><label className="mb-1.5 block text-[13px] font-bold">Kadaluarsa</label>
                    <input type="date" value={beli.tanggal_kadaluarsa} onChange={(e) => setBeli({ ...beli, tanggal_kadaluarsa: e.target.value })} disabled={busy} className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" /></div>
                </div>
                {Number(beli.jumlah_beli) > 0 && Number(beli.total_biaya) > 0 && (
                  <p className="rounded-lg bg-emerald-50/70 p-3 text-sm ring-1 ring-emerald-100">Harga satuan: <b className="tnum text-emerald-700">{formatRupiah(Number(beli.total_biaya) / Number(beli.jumlah_beli))}{beliSatuan ? ` / ${beliSatuan}` : ""}</b></p>
                )}
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-4">
                <button type="button" onClick={() => setShowBeli(false)} disabled={busy} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">Batal</button>
                <button type="submit" disabled={busy} className="h-12 flex-[2] rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">{busy ? "Menyimpan…" : "Simpan Pembelian"}</button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </DashboardLayout>
  );
}
