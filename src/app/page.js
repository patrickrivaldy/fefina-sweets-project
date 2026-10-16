"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatCard from "@/components/ui/StatCard";
import { supabase } from "@/config/supabase";
import { formatRupiah, todayWIB, wibKey, wibMonth } from "@/utils/format";
import { STOK_KRITIS } from "@/constants/app";
import { fetchModalMap } from "@/services/modal";
import {
  Package,
  Banknote,
  Wallet,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  ArrowRight,
  TriangleAlert,
} from "lucide-react";

  const dayKey = (d) => wibKey(d);

  export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [details, setDetails] = useState([]);
  const [kns, setKns] = useState([]);
  const [modalMap, setModalMap] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [p, t, e, d, k] = await Promise.all([
        supabase.from("produk").select("id_produk, nama_produk, stok").eq("is_deleted", false),
        supabase
          .from("transaksi_penjualan")
          .select("tanggal_transaksi, total_pembayaran, status_transaksi")
          .order("tanggal_transaksi", { ascending: false })
          .limit(200),
        supabase.from("pengeluaran_toko").select("nominal, tanggal").order("tanggal", { ascending: false }).limit(200),
        supabase
          .from("detail_transaksi")
          .select("jumlah_beli, subtotal, hpp_satuan, id_produk, produk(nama_produk), transaksi_penjualan(status_transaksi, tanggal_transaksi)")
          .limit(500),
        supabase
          .from("nota_konsinyasi")
          .select("id_konsinyasi, tanggal_titip, total_tagihan, detail_konsinyasi(jumlah_laku, id_produk)")
          .limit(200),
      ]);
      const mmap = await fetchModalMap();
      setProducts(p.data || []);
      setTransactions(t.data || []);
      setExpenses(e.data || []);
      setDetails(d.data || []);
      setKns(k.data || []);
      setModalMap(mmap);
      setLoading(false);
    };
    load();
  }, []);

  const today = todayWIB();
  const month = today.slice(0, 7);

  const aktif = useMemo(() => transactions.filter((t) => t.status_transaksi !== "Dibatalkan"), [transactions]);

  const omsetHari = useMemo(
    () => aktif.filter((t) => dayKey(t.tanggal_transaksi) === today).reduce((s, t) => s + (+t.total_pembayaran || 0), 0),
    [aktif, today]
  );
  const omsetBulan = useMemo(
    () => aktif.filter((t) => wibMonth(t.tanggal_transaksi) === month).reduce((s, t) => s + (+t.total_pembayaran || 0), 0)
      + kns.filter((k) => +k.total_tagihan > 0 && wibMonth(k.tanggal_titip) === month).reduce((s, k) => s + (+k.total_tagihan || 0), 0),
    [aktif, kns, month]
  );
  const keluarBulan = useMemo(
    () => expenses.filter((e) => wibMonth(e.tanggal) === month).reduce((s, e) => s + (+e.nominal || 0), 0),
    [expenses, month]
  );
  // Laba SERAGAM dengan Keuangan & Laporan: omset − HPP − beban (HPP dari hpp_satuan).
  // Laku konsinyasi ikut omset (alokasi bulan titip); HPP-nya estimasi modal × laku.
  const hppBulan = useMemo(
    () =>
      details
        .filter((d) => d.transaksi_penjualan?.status_transaksi !== "Dibatalkan" && wibMonth(d.transaksi_penjualan?.tanggal_transaksi) === month)
        .reduce((s, d) => s + (+d.jumlah_beli || 0) * (+d.hpp_satuan || 0), 0)
      + kns
        .filter((k) => +k.total_tagihan > 0 && wibMonth(k.tanggal_titip) === month)
        .reduce((s, k) => s + (k.detail_konsinyasi || []).reduce((a, d) => a + (+d.jumlah_laku || 0) * (modalMap[d.id_produk] || 0), 0), 0),
    [details, kns, modalMap, month]
  );
  const laba = omsetBulan - hppBulan - keluarBulan;

  const grafik = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = wibKey(d);
      arr.push({
        key,
        nama: d.toLocaleDateString("id-ID", { weekday: "short" }),
        total: aktif.filter((t) => dayKey(t.tanggal_transaksi) === key).reduce((s, t) => s + (+t.total_pembayaran || 0), 0),
      });
    }
    return arr;
  }, [aktif]);
  const maxG = Math.max(1, ...grafik.map((g) => g.total));

  const terlaris = useMemo(() => {
    const m = new Map();
    for (const d of details) {
      if (d.transaksi_penjualan?.status_transaksi === "Dibatalkan") continue;
      const nama = d.produk?.nama_produk || "Produk";
      const cur = m.get(d.id_produk) || { nama, qty: 0, omset: 0 };
      cur.qty += +d.jumlah_beli || 0;
      cur.omset += +d.subtotal || 0;
      m.set(d.id_produk, cur);
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [details]);

  const menipis = products.filter((p) => p.stok <= STOK_KRITIS);

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Ringkasan Toko Hari Ini
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold tracking-tight sm:text-[28px]">
              Dashboard Fefina Sweets
            </h1>
          </div>
          <Link
            href="/kasir"
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            <ShoppingCart size={17} /> Buka Kasir / POS
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={<Package size={16} />} label="Produk Aktif" value={loading ? "…" : products.length} accent={`${menipis.length} perlu restok`} />
          <StatCard icon={<Banknote size={16} />} label="Omset Hari Ini" value={loading ? "…" : formatRupiah(omsetHari)} accent="Kasir hari ini" />
          <StatCard icon={<Wallet size={16} />} label="Keluar Bulan Ini" value={loading ? "…" : formatRupiah(keluarBulan)} accent="Operasional" />
          <StatCard icon={<TrendingUp size={16} />} label="Laba Bulan Ini" value={loading ? "…" : formatRupiah(laba)} accent="Kasir + konsinyasi" />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-5">
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold">Penjualan 7 Hari Terakhir</h2>
                <p className="text-xs text-slate-500">Omset harian toko</p>
              </div>
              <Link href="/transaksi" className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
                Riwayat <ArrowUpRight size={14} />
              </Link>
            </div>
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">Memuat…</p>
            ) : (
              <div className="mt-4 flex h-44 items-end gap-2 rounded-lg bg-[#eff4ff]/70 p-4">
                {grafik.map((g) => {
                  const h = Math.max(8, Math.round((g.total / maxG) * 120));
                  const now = g.key === today;
                  return (
                    <div key={g.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span className="tnum text-[10px] font-bold text-slate-400">
                        {g.total > 0 ? `${Math.round(g.total / 1000)}rb` : ""}
                      </span>
                      <div title={`${g.nama}: ${formatRupiah(g.total)}`} style={{ height: h }} className={`w-full max-w-9 rounded-t-md ${now ? "bg-emerald-700" : "bg-emerald-500/70"}`} />
                      <span className={`text-[11px] ${now ? "font-bold text-emerald-700" : "text-slate-400"}`}>{g.nama}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 lg:col-span-2">
            <h2 className="text-[15px] font-bold">Produk Paling Laris</h2>
            <p className="text-xs text-slate-500">Top 5 berdasarkan pcs terjual</p>
            <div className="mt-4 space-y-2">
              {loading ? (
                <p className="py-6 text-center text-sm text-slate-400">Memuat…</p>
              ) : terlaris.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
                  Belum ada penjualan. Mulai dari <Link href="/kasir" className="font-bold text-emerald-700">Kasir</Link>.
                </p>
              ) : (
                terlaris.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className={`tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? "bg-emerald-700 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[13px] font-bold">{t.nama}</p>
                      <p className="tnum text-[11px] text-slate-500">{t.qty} pcs · {formatRupiah(t.omset)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {menipis.length > 0 && (
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-amber-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <TriangleAlert size={16} />
              </span>
              <h2 className="text-sm font-bold">Perlu restok ({menipis.length})</h2>
              <Link href="/stok" className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
                Ke Stok <ArrowRight size={13} />
              </Link>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {menipis.slice(0, 10).map((p) => (
                <span key={p.id_produk} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                  {p.nama_produk} · {p.stok}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
