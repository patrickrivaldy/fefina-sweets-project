"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { supabase } from "@/config/supabase";
import { formatRupiah, wibKey, wibDayBounds } from "@/utils/format";
import { usePeriode } from "@/hooks/usePeriode";
import { fetchModalMap } from "@/services/modal";
import { Download, Printer, TrendingUp, Wallet, BookOpenText, Factory } from "lucide-react";

export default function LaporanPage() {
  const [trx, setTrx] = useState([]);
  const [exp, setExp] = useState([]);
  const [kns, setKns] = useState([]);
  const [modalMap, setModalMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { preset, from, to, setFrom, setTo, applyPreset } = usePeriode("bulan-ini");
  const [rangeErr, setRangeErr] = useState("");

  // Filter tanggal di server (batas WIB → UTC) + hanya nota aktif.
  // Laba SERAGAM dengan Keuangan: omset − HPP − beban (HPP dari hpp_satuan).
  // Laku konsinyasi ikut omset (dialokasikan ke tanggal titip — tanggal laku tidak
  // dicatat DB), HPP-nya estimasi modal_aktual × pcs laku (batch titip sudah terpotong).
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setRangeErr(from && to && from > to ? "Tanggal mulai lebih besar dari tanggal akhir." : "");
      const baseT = supabase
        .from("transaksi_penjualan")
        .select("tanggal_transaksi, total_pembayaran, status_transaksi, detail_transaksi(jumlah_beli, hpp_satuan)")
        .neq("status_transaksi", "Dibatalkan")
        .order("tanggal_transaksi", { ascending: true })
        .limit(500);
      const baseE = supabase.from("pengeluaran_toko").select("tanggal, nominal").order("tanggal", { ascending: true }).limit(500);
      const baseK = supabase
        .from("nota_konsinyasi")
        .select("id_konsinyasi, tanggal_titip, total_tagihan, detail_konsinyasi(jumlah_laku, id_produk)")
        .order("tanggal_titip", { ascending: true })
        .limit(500);
      let tq = baseT, eq = baseE, kq = baseK;
      if (from && to && from <= to) {
        const a = wibDayBounds(from);
        const b = wibDayBounds(to);
        tq = baseT.gte("tanggal_transaksi", a.gte).lte("tanggal_transaksi", b.lte);
        eq = baseE.gte("tanggal", a.gte).lte("tanggal", b.lte);
        kq = baseK.gte("tanggal_titip", a.gte).lte("tanggal_titip", b.lte);
      }
      const [t, e, k, mmap] = await Promise.all([tq, eq, kq, fetchModalMap()]);
      setTrx(t.data || []);
      setExp(e.data || []);
      setKns(k.data || []);
      setModalMap(mmap);
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch tiap ganti periode
    load();
  }, [from, to]);

  const rekap = useMemo(() => {
    const m = new Map();
    for (const t of trx) {
      const k = wibKey(t.tanggal_transaksi);
      const c = m.get(k) || { tanggal: k, omset: 0, hpp: 0, keluar: 0, n: 0, nk: 0 };
      c.omset += +t.total_pembayaran || 0;
      c.hpp += (t.detail_transaksi || []).reduce((s, d) => s + (+d.jumlah_beli || 0) * (+d.hpp_satuan || 0), 0);
      c.n += 1;
      m.set(k, c);
    }
    // Laku konsinyasi → omset; HPP = ESTIMASI modal aktual × pcs laku.
    for (const nk of kns) {
      if (!(+nk.total_tagihan > 0)) continue;
      const k = wibKey(nk.tanggal_titip);
      const c = m.get(k) || { tanggal: k, omset: 0, hpp: 0, keluar: 0, n: 0, nk: 0 };
      c.omset += +nk.total_tagihan || 0;
      c.hpp += (nk.detail_konsinyasi || []).reduce((s, d) => s + (+d.jumlah_laku || 0) * (modalMap[d.id_produk] || 0), 0);
      c.nk += 1;
      m.set(k, c);
    }
    for (const e of exp) {
      const k = wibKey(e.tanggal);
      const c = m.get(k) || { tanggal: k, omset: 0, hpp: 0, keluar: 0, n: 0, nk: 0 };
      c.keluar += +e.nominal || 0;
      m.set(k, c);
    }
    return [...m.values()].sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)).map((r) => ({ ...r, laba: r.omset - r.hpp - r.keluar }));
  }, [trx, exp, kns, modalMap]);

  const totO = rekap.reduce((s, r) => s + r.omset, 0);
  const totH = rekap.reduce((s, r) => s + r.hpp, 0);
  const totK = rekap.reduce((s, r) => s + r.keluar, 0);
  const totL = totO - totH - totK;
  const totN = rekap.reduce((s, r) => s + r.n, 0);
  const totNK = rekap.reduce((s, r) => s + r.nk, 0);

  const csv = () => {
    const head = "Tanggal;Transaksi;Nota Konsinyasi;Omset;HPP;Operasional;Laba\n";
    const lines = rekap.map((r) => [r.tanggal, r.n, r.nk, r.omset, Math.round(r.hpp), r.keluar, Math.round(r.laba)].join(";"));
    lines.push(`TOTAL;${totN};${totNK};${totO};${Math.round(totH)};${totK};${Math.round(totL)}`);
    const blob = new Blob(["\uFEFF" + head + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Rekap Profitabilitas
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold tracking-tight sm:text-[28px]">
              Laporan Laba Rugi
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Laba = omset − HPP − operasional. Unduh tiap akhir bulan sebagai arsip.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={csv} disabled={!rekap.length} className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-40">
              <Download size={16} /> Excel / CSV
            </button>
            <button type="button" onClick={() => window.print()} className="no-print flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">
              <Printer size={16} /> PDF / Cetak
            </button>
          </div>
        </div>

        <div className="no-print rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-wrap gap-1.5">
            {[["hari-ini", "Hari Ini"], ["7-hari", "7 Hari Terakhir"], ["bulan-ini", "Bulan Ini"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => applyPreset(v)} className={`h-10 rounded-lg px-4 text-[13px] font-bold ${preset === v ? "bg-emerald-700 text-white shadow-sm" : "bg-[#eff4ff] text-slate-600 hover:bg-slate-200"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-lg bg-[#eff4ff] px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-600/25" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-lg bg-[#eff4ff] px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-600/25" />
          </div>
          {rangeErr && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-600">{rangeErr}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Omset</p>
              <TrendingUp size={16} className="text-emerald-700" />
            </div>
            <p className="tnum mt-2 truncate text-lg font-bold text-emerald-700 sm:text-[22px]">{loading ? "…" : formatRupiah(totO)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{totN} kasir + {totNK} konsinyasi</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">HPP Produk</p>
              <Factory size={16} className="text-amber-600" />
            </div>
            <p className="tnum mt-2 truncate text-lg font-bold text-amber-700 sm:text-[22px]">{loading ? "…" : formatRupiah(Math.round(totH))}</p>
            <p className="mt-1 text-[11px] text-slate-400">Kasir akurat + est. konsinyasi</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Operasional</p>
              <Wallet size={16} className="text-red-500" />
            </div>
            <p className="tnum mt-2 truncate text-lg font-bold text-red-600 sm:text-[22px]">{loading ? "…" : formatRupiah(totK)}</p>
            <p className="mt-1 text-[11px] text-slate-400">Kas keluar</p>
          </div>
          <div className={`rounded-xl p-4 shadow-sm ring-1 sm:p-5 ${totL >= 0 ? "bg-emerald-700 text-white ring-emerald-800" : "bg-red-600 text-white ring-red-700"}`}>
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{totL >= 0 ? "Laba Bersih" : "Rugi"}</p>
              <BookOpenText size={16} className="opacity-80" />
            </div>
            <p className="tnum mt-2 truncate text-lg font-bold sm:text-[22px]">{loading ? "…" : formatRupiah(totL)}</p>
            <p className="mt-1 text-[11px] opacity-70">{from || "…"} s/d {to || "…"}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[15px] font-bold">Rincian Laba per Hari</h2>
            <p className="text-xs text-slate-500">Setiap baris = 1 hari. Baris merah berarti hari itu rugi. Omset & HPP termasuk laku konsinyasi (dialokasikan ke tanggal titip; HPP konsinyasi = estimasi modal × pcs laku).</p>
          </div>
          {loading ? (
            <p className="p-10 text-center text-sm text-slate-400">Menghitung…</p>
          ) : rekap.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">Belum ada data pada rentang ini.</p>
          ) : (
            <div className="nice-scroll overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-bold">Tanggal</th>
                    <th className="px-4 py-3 text-center font-bold">Trx</th>
                    <th className="px-4 py-3 text-right font-bold">Omset</th>
                    <th className="px-4 py-3 text-right font-bold">HPP</th>
                    <th className="px-4 py-3 text-right font-bold">Operasional</th>
                    <th className="px-5 py-3 text-right font-bold">Laba</th>
                  </tr>
                </thead>
                <tbody>
                  {rekap.map((r) => (
                    <tr key={r.tanggal} className="h-12 border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-2 text-xs font-bold">
                        {new Date(r.tanggal + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                      </td>
                      <td className="tnum px-4 py-2 text-center text-sm" title="Nota kasir + nota konsinyasi">{r.n + r.nk}</td>
                      <td className="tnum px-4 py-2 text-right text-[13px] text-emerald-700">{formatRupiah(r.omset)}</td>
                      <td className="tnum px-4 py-2 text-right text-[13px] text-amber-700">{formatRupiah(Math.round(r.hpp))}</td>
                      <td className="tnum px-4 py-2 text-right text-[13px] text-red-500">{formatRupiah(r.keluar)}</td>
                      <td className={`tnum px-5 py-2 text-right text-[13px] font-bold ${r.laba < 0 ? "text-red-600" : ""}`}>{formatRupiah(Math.round(r.laba))}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-slate-50/70 text-sm font-bold">
                    <td className="px-5 py-3">TOTAL</td>
                    <td className="tnum px-4 py-3 text-center">{totN}</td>
                    <td className="tnum px-4 py-3 text-right text-emerald-700">{formatRupiah(totO)}</td>
                    <td className="tnum px-4 py-3 text-right text-amber-700">{formatRupiah(Math.round(totH))}</td>
                    <td className="tnum px-4 py-3 text-right text-red-600">{formatRupiah(totK)}</td>
                    <td className="tnum px-5 py-3 text-right">{formatRupiah(Math.round(totL))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
