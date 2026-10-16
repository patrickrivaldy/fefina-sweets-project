"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, todayWIB, wibDateTime } from "@/utils/format";
import { KATEGORI_PENGELUARAN } from "@/constants/app";
import RupiahInput from "@/components/ui/RupiahInput";
import { Wallet, Trash2, Search, ArrowLeft, Check } from "lucide-react";

export default function CatatPengeluaranPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [adaKategori, setAdaKategori] = useState(true);
  const [form, setForm] = useState({ keterangan: "", nominal: "", tanggal: todayWIB(), kategori: "Operasional" });

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

  const simpan = async (e) => {
    e.preventDefault();
    setFormErr("");
    setOkMsg("");
    if (!form.keterangan.trim()) return setFormErr("Tulis keperluannya dulu.");
    const n = Number(form.nominal);
    if (!n || n <= 0) return setFormErr("Nominal harus lebih dari 0.");
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        keterangan: form.keterangan.trim(),
        nominal: n,
        tanggal: form.tanggal ? wibDateTime(form.tanggal) : new Date().toISOString(),
      };
      if (adaKategori) payload.kategori = form.kategori || "Lainnya";
      let ins = await supabase.from("pengeluaran_toko").insert([payload]);
      if (ins.error && adaKategori && /column|kategori/i.test(ins.error.message || "")) {
        delete payload.kategori;
        setAdaKategori(false);
        ins = await supabase.from("pengeluaran_toko").insert([payload]);
      }
      if (ins.error) throw new Error(ins.error.message);
      setForm({ keterangan: "", nominal: "", tanggal: todayWIB(), kategori: "Operasional" });
      setOkMsg(`Tersimpan: keluar ${formatRupiah(n)}.`);
      await load();
    } catch (err) {
      setFormErr(err.message || "Gagal menyimpan.");
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
            <Link href="/pengeluaran" className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              <ArrowLeft size={16} /> Ringkasan Keuangan
            </Link>
          }
        />

        <div className="grid items-start gap-4 xl:grid-cols-5">
          {/* Form */}
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 xl:col-span-2">
            <h2 className="text-[15px] font-bold">Catat Baru</h2>
            <p className="mt-0.5 text-xs text-slate-500">Contoh: token listrik, paper bag, gaji.</p>
            <form onSubmit={simpan} className="mt-4 space-y-4">
              {formErr && <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{formErr}</p>}
              {okMsg && (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-[13px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  <Check size={15} strokeWidth={3} /> {okMsg}
                </p>
              )}
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Keterangan *</label>
                <input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} disabled={busy} autoFocus placeholder="Tulis keperluan…" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" />
              </div>
              {adaKategori && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold">Kategori</label>
                  <div className="flex flex-wrap gap-1.5">
                    {KATEGORI_PENGELUARAN.map((k) => (
                      <button key={k} type="button" onClick={() => setForm({ ...form, kategori: k })} disabled={busy}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${form.kategori === k ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold">Nominal (Rp) *</label>
                  <RupiahInput value={form.nominal} onChange={(v) => setForm({ ...form, nominal: v })} disabled={busy} placeholder="50.000" className="tnum h-11 w-full rounded-lg border border-slate-300 px-3.5 text-right text-sm font-bold outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold">Tanggal</label>
                  <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} disabled={busy} className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" />
                </div>
              </div>
              {Number(form.nominal) > 0 && (
                <p className="rounded-lg bg-red-50/60 p-3 text-sm ring-1 ring-red-100">
                  Keluar: <b className="tnum text-red-600">- {formatRupiah(form.nominal)}</b>
                </p>
              )}
              <button type="submit" disabled={busy} className="h-12 w-full rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
                {busy ? "Menyimpan…" : "Simpan Pengeluaran"}
              </button>
            </form>
          </section>

          {/* Daftar */}
          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 xl:col-span-3">
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
    </DashboardLayout>
  );
}
