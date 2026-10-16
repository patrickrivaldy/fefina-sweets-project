"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import StrukNota from "@/features/kasir/components/StrukNota";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, todayWIB, wibKey, wibDayBounds } from "@/utils/format";
import { usePeriode } from "@/hooks/usePeriode";
import { fetchModalMap } from "@/services/modal";
import {
  X,
  TrendingUp,
  Wallet,
  ReceiptText,
  BookOpenText,
  Eye,
  Printer,
} from "lucide-react";

const isoDay = (d) => wibKey(d);


export default function PengeluaranPage() {
  const [trx, setTrx] = useState([]);
  const [exp, setExp] = useState([]);
  const [kns, setKns] = useState([]);
  const [modalMap, setModalMap] = useState({});
  const [bayarMap, setBayarMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { preset, from, to, setFrom, setTo, applyPreset } = usePeriode("bulan-ini");
  const [adaKategori, setAdaKategori] = useState(true);
  const [rangeErr, setRangeErr] = useState("");
  const [detail, setDetail] = useState(null);

  // Filter tanggal dikerjakan di server (batas WIB → UTC) supaya tidak mengunduh
  // ribuan baris yang akhirnya dibuang di browser.
  const load = async (f, t) => {
    setLoading(true);
    setRangeErr(f && t && f > t ? "Tanggal mulai lebih besar dari tanggal akhir." : "");
    let tq = supabase
      .from("transaksi_penjualan")
      .select(`id_transaksi, tanggal_transaksi, total_pembayaran, diskon, metode_pembayaran, status_transaksi,
        detail_transaksi (jumlah_beli, subtotal, hpp_satuan, produk (nama_produk))`)
      .neq("status_transaksi", "Dibatalkan")
      .order("tanggal_transaksi", { ascending: true })
      .limit(500);
    let eq = supabase
      .from("pengeluaran_toko")
      .select("id_pengeluaran, tanggal, nominal, keterangan, kategori")
      .order("tanggal", { ascending: false })
      .limit(500);
    let kq = supabase
      .from("nota_konsinyasi")
      .select("id_konsinyasi, tanggal_titip, total_tagihan, detail_konsinyasi(jumlah_laku, id_produk)")
      .order("tanggal_titip", { ascending: true })
      .limit(500);
    if (f && t && f <= t) {
      const a = wibDayBounds(f);
      const b = wibDayBounds(t);
      tq = tq.gte("tanggal_transaksi", a.gte).lte("tanggal_transaksi", b.lte);
      eq = eq.gte("tanggal", a.gte).lte("tanggal", b.lte);
      kq = kq.gte("tanggal_titip", a.gte).lte("tanggal_titip", b.lte);
    }
    const [tx, ex, kk, mmap, bb] = await Promise.all([tq, eq, kq, fetchModalMap(),
      supabase.from("pembayaran_konsinyasi").select("id_konsinyasi, nominal").limit(500),
    ]);
    setTrx(tx.data || []);
    setKns(kk.data || []);
    setModalMap(mmap);
    const bmap = {};
    for (const row of bb.data || []) bmap[row.id_konsinyasi] = (bmap[row.id_konsinyasi] || 0) + (+row.nominal || 0);
    setBayarMap(bmap);
    if (ex.error && /column|kategori/i.test(ex.error.message || "")) {
      // db-draft.md belum dijalankan penuh → muat tanpa kategori
      setAdaKategori(false);
      let eq2 = supabase.from("pengeluaran_toko").select("id_pengeluaran, tanggal, nominal, keterangan").order("tanggal", { ascending: false }).limit(500);
      if (f && t && f <= t) {
        const a = wibDayBounds(f);
        const b = wibDayBounds(t);
        eq2 = eq2.gte("tanggal", a.gte).lte("tanggal", b.lte);
      }
      const retry = await eq2;
      setExp(retry.data || []);
    } else {
      setExp(ex.data || []);
    }
    setLoading(false);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal + tiap ganti periode
    load(from, to);
  }, [from, to]);

  const tF = trx;
  const eF = exp;

  // Laku konsinyasi ikut omset (alokasi tanggal titip); HPP-nya estimasi modal × laku.
  const knsAktif = kns.filter((k) => +k.total_tagihan > 0);
  const omzetKns = knsAktif.reduce((s, k) => s + (+k.total_tagihan || 0), 0);
  const hppKns = knsAktif.reduce(
    (s, k) => s + (k.detail_konsinyasi || []).reduce((a, d) => a + (+d.jumlah_laku || 0) * (modalMap[d.id_produk] || 0), 0),
    0
  );
  // Piutang = tagihan − cicilan yang sudah masuk (uang bisa datang random tiap kunjungan).
  const piutangKns = knsAktif.reduce((s, k) => s + Math.max(0, (+k.total_tagihan || 0) - (bayarMap[k.id_konsinyasi] || 0)), 0);

  const omzet = tF.reduce((s, t) => s + (+t.total_pembayaran || 0), 0) + omzetKns;
  const beban = eF.reduce((s, e) => s + (+e.nominal || 0), 0);
  const hpp = tF.reduce(
    (s, t) =>
      s +
      (t.detail_transaksi || []).reduce(
        (a, d) => a + (Number(d.jumlah_beli) || 0) * (Number(d.hpp_satuan) || 0),
        0
      ),
    0
  ) + hppKns;
  const laba = omzet - hpp - beban;
  const margin = omzet > 0 ? (laba / omzet) * 100 : 0;
  const nDok = tF.length + knsAktif.length;
  const rataNota = nDok > 0 ? omzet / nDok : 0;

  // tren harian
  const days = useMemo(() => {
    if (!from || !to) return [];
    const out = [];
    const cur = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    while (cur <= end && out.length < 31) {
      const k = wibKey(cur);
      out.push({
        key: k,
        label: cur.toLocaleDateString("id-ID", { weekday: "short" }),
        omzet: trx.filter((t) => isoDay(t.tanggal_transaksi) === k).reduce((s, t) => s + (+t.total_pembayaran || 0), 0),
        keluar: exp.filter((e) => isoDay(e.tanggal) === k).reduce((s, e) => s + (+e.nominal || 0), 0),
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [trx, exp, from, to]);

  const maxV = Math.max(1, ...days.map((d) => Math.max(d.omzet, d.keluar)));
  const W = 720;
  const H = 180;
  const P = 8;
  const xy = (i, v) => [
    P + (i * (W - P * 2)) / Math.max(1, days.length - 1),
    H - P - (v / maxV) * (H - P * 2),
  ];
  const line = (get) => days.map((d, i) => xy(i, get(d)).join(",")).join(" ");
  const area = (get) =>
    days.length
      ? `${P},${H - P} ` + line(get) + ` ${xy(days.length - 1, 0)[0]},${H - P}`
      : "";

  const toStruk = (r) => {
    const items = (r.detail_transaksi || []).map((d) => ({
      nama_produk: d.produk?.nama_produk || "Produk",
      qty: d.jumlah_beli,
      harga_jual: d.jumlah_beli > 0 ? Math.round(d.subtotal / d.jumlah_beli) : 0,
      subtotal: d.subtotal,
    }));
    const sub = items.reduce((s, i) => s + i.subtotal, 0);
    const dis = +r.diskon || 0;
    return {
      id_transaksi: r.id_transaksi, tanggal: r.tanggal_transaksi, items, subtotal: sub,
      biayaPlatform: Math.max(0, (+r.total_pembayaran || 0) - sub + dis),
      tipePenjualan: "-", diskon: dis, total: +r.total_pembayaran || 0,
      metode: (r.metode_pembayaran || "").split("(")[0].trim() || "Tunai",
      uang: +r.total_pembayaran || 0, kembalian: 0,
    };
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Ringkasan Arus Kas & Profitabilitas
            </p>
            <h1 className="mt-0.5 text-[26px] font-bold leading-9 tracking-tight sm:text-[32px] sm:leading-10">
              Keuangan & Laba Usaha
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Pantau omzet penjualan, rincian biaya operasional, dan laba bersih toko tanpa kalkulasi rumit.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex gap-1.5 rounded-xl bg-[#eff4ff] p-1">
              {[["hari-ini", "Hari Ini"], ["7-hari", "7 Hari Terakhir"], ["bulan-ini", "Bulan Ini"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => applyPreset(v)} className={`h-9 rounded-lg px-3.5 text-xs font-bold transition ${preset === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  {l}
                </button>
              ))}
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[132px] rounded-lg bg-transparent px-1 text-xs font-bold text-slate-500 outline-none" title="Dari" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[132px] rounded-lg bg-transparent px-1 text-xs font-bold text-slate-500 outline-none" title="Sampai" />
            </div>
            {rangeErr && <p className="rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-600">{rangeErr}</p>}
          </div>
        </div>

        {/* Metrik */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Omzet<br />Penjualan</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff4ff] text-emerald-700"><TrendingUp size={16} /></span>
            </div>
            <p className="tnum mt-2 break-words text-xl font-bold leading-7 sm:text-[26px] sm:leading-8">{loading ? "…" : formatRupiah(omzet)}</p>
            <p className="mt-1.5 font-mono text-[11px] text-slate-400">Sumber: transaksi_penjualan.total_pembayaran</p>
            <p className="mt-1 text-xs text-slate-500"><b className="text-emerald-700">{tF.length} kasir + {knsAktif.length} konsinyasi</b> pada periode ini</p>
            {piutangKns > 0 && <p className="tnum mt-1 text-xs text-amber-700">Piutang konsinyasi blm diterima: <b>{formatRupiah(Math.round(piutangKns))}</b></p>}
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Beban<br />Operasional</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500"><Wallet size={16} /></span>
            </div>
            <p className="tnum mt-2 break-words text-xl font-bold leading-7 sm:text-[26px] sm:leading-8">{loading ? "…" : formatRupiah(beban)}</p>
            <p className="mt-1.5 font-mono text-[11px] text-slate-400">Sumber: pengeluaran_toko.nominal</p>
            <p className="mt-1 text-xs text-slate-500"><b className="text-red-600">{eF.length} Catatan</b> • HPP {formatRupiah(Math.round(hpp))} (incl. est. konsinyasi)</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-emerald-200">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estimasi Laba<br />Bersih</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><BookOpenText size={16} /></span>
            </div>
            <p className={`tnum mt-2 break-words text-xl font-bold leading-7 sm:text-[26px] sm:leading-8 ${laba < 0 ? "text-red-600" : "text-emerald-700"}`}>{loading ? "…" : formatRupiah(laba)}</p>
            <p className="mt-1.5 text-xs text-slate-500">Omzet dikurangi HPP & beban</p>
            <p className="mt-1 text-xs text-slate-500"><span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">Margin {margin.toFixed(1)}%</span> Profit bersih toko</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total<br />Transaksi</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff4ff] text-emerald-700"><ReceiptText size={16} /></span>
            </div>
            <p className="tnum mt-2 break-words text-xl font-bold leading-7 sm:text-[26px] sm:leading-8">{loading ? "…" : nDok} <span className="text-base font-semibold text-slate-400">Dok</span></p>
            <p className="mt-1.5 text-xs text-slate-500">Rata-rata <b>{formatRupiah(Math.round(rataNota))}</b> per dokumen ({tF.length} kasir + {knsAktif.length} konsinyasi)</p>
          </div>
        </div>

        {/* Tren */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold">Tren Komposisi Kas {days.length > 7 ? `${days.length} Hari` : "7 Hari Terakhir"}</h2>
              <p className="text-xs text-slate-500">Perbandingan harian omzet vs pengeluaran operasional toko.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-700" /> Penjualan</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Pengeluaran</span>
            </div>
          </div>
          {days.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Pilih rentang tanggal dulu.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H + 22}`} className="min-w-[560px]" role="img" aria-label="Grafik tren kas">
                <polygon points={area((d) => d.omzet)} fill="rgba(5,150,105,0.10)" />
                <polyline points={line((d) => d.omzet)} fill="none" stroke="#047857" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={line((d) => d.keluar)} fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
                {days.map((d, i) => {
                  const [x] = xy(i, 0);
                  return (
                    <text key={d.key} x={x} y={H + 16} textAnchor="middle" fontSize="10" fill={d.key === todayWIB() ? "#047857" : "#94a3b8"} fontWeight={d.key === todayWIB() ? "700" : "500"}>
                      {d.key === todayWIB() ? "Hari Ini" : d.label}
                    </text>
                  );
                })}
                {days.map((d, i) => {
                  const [x, y] = xy(i, d.omzet);
                  return <circle key={"o" + d.key} cx={x} cy={y} r="3.5" fill="#047857" />;
                })}
                {days.map((d, i) => {
                  const [x, y] = xy(i, d.keluar);
                  return <circle key={"k" + d.key} cx={x} cy={y} r="3" fill="#dc2626" />;
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Dua tabel */}
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <div>
                <h2 className="flex items-center gap-2 text-[15px] font-bold"><Wallet size={16} className="text-red-500" /> Beban Operasional Toko</h2>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">Riwayat pencatatan tabel pengeluaran_toko</p>
              </div>
              <span className="rounded-full bg-[#eff4ff] px-2.5 py-1 text-[11px] font-bold text-slate-600">{eF.length} Entri</span>
            </div>
            {adaKategori && eF.length > 0 && (() => {
              const perKat = {};
              for (const x of eF) {
                const k = x.kategori || "Lainnya";
                perKat[k] = (perKat[k] || 0) + (+x.nominal || 0);
              }
              return (
                <div className="flex flex-wrap gap-1.5 px-5 pb-1 pt-2">
                  {Object.entries(perKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                    <span key={k} className="tnum rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 ring-1 ring-red-100">{k}: {formatRupiah(v)}</span>
                  ))}
                </div>
              );
            })()}
            <div className="nice-scroll max-h-[420px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50/95 text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-5 py-2.5 font-bold">Keterangan</th>
                    <th className="px-3 py-2.5 font-bold">Tanggal</th>
                    <th className="px-5 py-2.5 text-right font-bold">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {eF.slice(0, 30).map((r) => (
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
                    </tr>
                  ))}
                  {eF.length === 0 && !loading && (
                    <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-400">Belum ada pengeluaran pada periode ini. Catat di menu Catat Pengeluaran.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <div>
                <h2 className="flex items-center gap-2 text-[15px] font-bold"><ReceiptText size={16} className="text-emerald-700" /> Riwayat Transaksi Penjualan</h2>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">Ringkasan tabel transaksi_penjualan (HPP dari detail_transaksi.hpp_satuan)</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Real-time POS
              </span>
            </div>
            <div className="nice-scroll max-h-[420px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50/95 text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-5 py-2.5 font-bold">ID & Jam</th>
                    <th className="px-3 py-2.5 font-bold">Metode</th>
                    <th className="px-3 py-2.5 text-right font-bold">Diskon</th>
                    <th className="px-3 py-2.5 text-right font-bold">Total Bayar</th>
                    <th className="px-4 py-2.5 text-right font-bold">Struk</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tF].reverse().slice(0, 30).map((r) => {
                    const n = (r.detail_transaksi || []).reduce((s, d) => s + (+d.jumlah_beli || 0), 0);
                    const metode = (r.metode_pembayaran || "").split("(")[0].trim();
                    return (
                      <tr key={r.id_transaksi} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-5 py-2.5">
                          <p className="font-mono text-[11px] font-bold">#{r.id_transaksi}</p>
                          <p className="text-[11px] text-slate-500">{formatTanggal(r.tanggal_transaksi, true)} • {n} barang</p>
                        </td>
                        <td className="px-3 py-2.5"><Badge tone={metode === "Tunai" ? "blue" : "green"} dot={false}>{metode || "-"}</Badge></td>
                        <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-xs text-slate-500">{+r.diskon > 0 ? formatRupiah(r.diskon) : "-"}</td>
                        <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-bold text-emerald-700">{formatRupiah(r.total_pembayaran)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button type="button" onClick={() => setDetail(r)} className="rounded-lg bg-[#eff4ff] px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
                            Rincian
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {tF.length === 0 && !loading && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">Belum ada transaksi pada periode ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold">#{detail.id_transaksi}</p>
                <p className="text-[11px] text-slate-500">{formatTanggal(detail.tanggal_transaksi, true)}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Tutup" className="rounded-lg bg-slate-100 p-2 text-slate-500"><X size={16} /></button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Eye size={15} className="text-slate-400" />
              <span className="text-slate-500">Total dibayar</span>
              <b className="tnum ml-auto text-emerald-700">{formatRupiah(detail.total_pembayaran)}</b>
            </div>
            <div className="mt-3"><StrukNota data={toStruk(detail)} /></div>
            <button type="button" onClick={() => window.print()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              <Printer size={15} /> Cetak Ulang
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
