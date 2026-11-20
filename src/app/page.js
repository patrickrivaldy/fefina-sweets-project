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
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  RefreshCw,
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
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
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
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const initialLoad = async () => {
      if (!active) return;
      await load();
    };
    void initialLoad();
    return () => {
      active = false;
    };
  }, []);

  const today = todayWIB();
  const month = today.slice(0, 7);

  const aktif = useMemo(
    () => transactions.filter((t) => t.status_transaksi !== "Dibatalkan"),
    [transactions]
  );

  const omsetHari = useMemo(
    () =>
      aktif
        .filter((t) => dayKey(t.tanggal_transaksi) === today)
        .reduce((s, t) => s + (+t.total_pembayaran || 0), 0),
    [aktif, today]
  );

  const omsetBulan = useMemo(
    () =>
      aktif
        .filter((t) => wibMonth(t.tanggal_transaksi) === month)
        .reduce((s, t) => s + (+t.total_pembayaran || 0), 0) +
      kns
        .filter((k) => +k.total_tagihan > 0 && wibMonth(k.tanggal_titip) === month)
        .reduce((s, k) => s + (+k.total_tagihan || 0), 0),
    [aktif, kns, month]
  );

  const keluarBulan = useMemo(
    () =>
      expenses
        .filter((e) => wibMonth(e.tanggal) === month)
        .reduce((s, e) => s + (+e.nominal || 0), 0),
    [expenses, month]
  );

  // Perhitungan laba mengikuti halaman Keuangan & Laporan.
  const hppBulan = useMemo(
    () =>
      details
        .filter(
          (d) =>
            d.transaksi_penjualan?.status_transaksi !== "Dibatalkan" &&
            wibMonth(d.transaksi_penjualan?.tanggal_transaksi) === month
        )
        .reduce((s, d) => s + (+d.jumlah_beli || 0) * (+d.hpp_satuan || 0), 0) +
      kns
        .filter((k) => +k.total_tagihan > 0 && wibMonth(k.tanggal_titip) === month)
        .reduce(
          (s, k) =>
            s +
            (k.detail_konsinyasi || []).reduce(
              (a, d) => a + (+d.jumlah_laku || 0) * (modalMap[d.id_produk] || 0),
              0
            ),
          0
        ),
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
        tanggal: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        total: aktif
          .filter((t) => dayKey(t.tanggal_transaksi) === key)
          .reduce((s, t) => s + (+t.total_pembayaran || 0), 0),
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
  const tanggalHariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardLayout>
      <div className="dashboard-page mx-auto flex w-full max-w-[1440px] flex-col gap-5 sm:gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-800 sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Ringkasan toko
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
              Dashboard Fefina Sweets
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500 sm:text-sm">
              <CalendarDays size={14} />
              {tanggalHariIni}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Perbarui
            </button>
            <Link
              href="/kasir"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0 sm:min-w-[180px]"
            >
              <ShoppingCart size={17} />
              Buka Kasir / POS
            </Link>
          </div>
        </header>

        <section aria-label="Ringkasan keuangan dan produk" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <div className="dashboard-stat-card">
            <StatCard
              icon={<Package size={17} />}
              label="Produk Aktif"
              value={loading ? "…" : products.length}
              accent={`${menipis.length} perlu restok`}
            />
          </div>
          <div className="dashboard-stat-card">
            <StatCard
              icon={<Banknote size={17} />}
              label="Omset Hari Ini"
              value={loading ? "…" : formatRupiah(omsetHari)}
              accent="Kasir hari ini"
            />
          </div>
          <div className="dashboard-stat-card">
            <StatCard
              icon={<Wallet size={17} />}
              label="Keluar Bulan Ini"
              value={loading ? "…" : formatRupiah(keluarBulan)}
              accent="Operasional"
            />
          </div>
          <div className="dashboard-stat-card dashboard-stat-card--profit">
            <StatCard
              icon={<TrendingUp size={17} />}
              label="Laba Bulan Ini"
              value={loading ? "…" : formatRupiah(laba)}
              accent="Kasir + konsinyasi"
            />
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <ChartNoAxesColumnIncreasing size={17} />
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">
                    Penjualan 7 Hari Terakhir
                  </h2>
                </div>
                <p className="pl-10 text-xs text-slate-500">Omset harian toko</p>
              </div>
              <Link
                href="/transaksi"
                className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
              >
                Riwayat <ArrowUpRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="flex h-48 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
                Memuat data penjualan…
              </div>
            ) : (
              <div className="rounded-xl bg-[#f4f7ff] px-2 pb-3 pt-4 sm:px-4">
                <div className="flex h-44 items-end justify-between gap-1.5 sm:gap-3">
                  {grafik.map((g) => {
                    const h = Math.max(5, Math.round((g.total / maxG) * 112));
                    const now = g.key === today;
                    return (
                      <div key={g.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <span className="max-w-full truncate text-[9px] font-bold text-slate-400 sm:text-[10px]">
                          {g.total > 0 ? `${Math.round(g.total / 1000)}rb` : "—"}
                        </span>
                        <div className="flex h-[116px] w-full items-end justify-center">
                          <div
                            title={`${g.nama}, ${g.tanggal}: ${formatRupiah(g.total)}`}
                            style={{ height: `${h}px` }}
                            className={`w-full max-w-10 rounded-t-lg transition-all duration-300 ${
                              now
                                ? "bg-emerald-700 shadow-md shadow-emerald-900/15"
                                : "bg-emerald-400 hover:bg-emerald-500"
                            }`}
                          />
                        </div>
                        <span className={`text-[10px] sm:text-[11px] ${now ? "font-extrabold text-emerald-800" : "font-medium text-slate-400"}`}>
                          {g.nama}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {lastUpdated && (
              <p className="mt-3 text-right text-[10px] text-slate-400">
                Diperbarui {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-extrabold text-slate-900 sm:text-base">Produk Paling Laris</h2>
              <p className="mt-1 text-xs text-slate-500">Top 5 berdasarkan pcs terjual</p>
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-400">Memuat data produk…</p>
              ) : terlaris.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500">
                  Belum ada penjualan. Mulai dari{" "}
                  <Link href="/kasir" className="font-bold text-emerald-700 hover:underline">Kasir</Link>.
                </p>
              ) : (
                terlaris.map((t, i) => (
                  <div key={t.nama + i} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 transition hover:border-emerald-100 hover:bg-emerald-50/50">
                    <span className={`tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                      i === 0
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800 sm:text-sm">{t.nama}</p>
                      <p className="tnum mt-1 text-[10px] text-slate-500 sm:text-[11px]">
                        {t.qty} pcs <span className="px-1 text-slate-300">·</span> {formatRupiah(t.omset)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {menipis.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <TriangleAlert size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold text-slate-900">Perlu restok ({menipis.length})</h2>
                <p className="mt-0.5 text-xs text-slate-500">Produk dengan stok pada atau di bawah batas kritis</p>
              </div>
              <Link href="/stok" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900">
                Ke Stok <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {menipis.slice(0, 10).map((p) => (
                <span key={p.id_produk} className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                  <span className="max-w-[180px] truncate">{p.nama_produk}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold">{p.stok}</span>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
