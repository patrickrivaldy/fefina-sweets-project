"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import StrukNota from "@/features/kasir/components/StrukNota";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, wibDayBounds } from "@/utils/format";
import { usePeriode } from "@/hooks/usePeriode";
import { useRole } from "@/store/RoleContext";
import { ReceiptText, Search, Download, Printer, X } from "lucide-react";


export default function TransaksiPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { preset, from, to, setFrom, setTo, applyPreset } = usePeriode("hari-ini");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [rangeErr, setRangeErr] = useState("");
  const [batas, setBatas] = useState(300);
  const [totalSemua, setTotalSemua] = useState(null);
  const [voidBusy, setVoidBusy] = useState(false);

  // Rentang tanggal difilter di server (batas WIB → UTC); pencarian ID tetap di browser.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      setRangeErr(from && to && from > to ? "Tanggal mulai lebih besar dari tanggal akhir." : "");
      let query = supabase
        .from("transaksi_penjualan")
        .select(`id_transaksi, tanggal_transaksi, total_pembayaran, diskon, metode_pembayaran, status_transaksi,
          detail_transaksi (jumlah_beli, subtotal, produk (nama_produk))`)
        .order("tanggal_transaksi", { ascending: false })
        .limit(batas);
      if (from && to && from <= to) {
        const a = wibDayBounds(from);
        const b = wibDayBounds(to);
        query = query.gte("tanggal_transaksi", a.gte).lte("tanggal_transaksi", b.lte);
      }
      const [{ data, error }, count] = await Promise.all([
        query,
        (async () => {
          let cq = supabase.from("transaksi_penjualan").select("id_transaksi", { count: "exact", head: true });
          if (from && to && from <= to) {
            const a = wibDayBounds(from);
            const b = wibDayBounds(to);
            cq = cq.gte("tanggal_transaksi", a.gte).lte("tanggal_transaksi", b.lte);
          }
          const r = await cq;
          return r;
        })(),
      ]);
      setTotalSemua(count?.count ?? null);
      if (error) {
        setError("Gagal memuat riwayat.");
        setRows([]);
      } else setRows(data || []);
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch tiap ganti periode
    load();
  }, [from, to, batas]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) =>
      r.id_transaksi.toLowerCase().includes(k) ||
      (r.metode_pembayaran || "").toLowerCase().includes(k) ||
      String(r.total_pembayaran).includes(k)
    );
  }, [rows, q]);

  // Void: update status → trigger DB kembalikan stok + batch (tanpa hapus data).
  const { pengguna } = useRole();
  const voidNota = async (r) => {
    if (r.status_transaksi === "Dibatalkan") return;
    if (!window.confirm(`Batalkan nota ${r.id_transaksi}? Stok kembali otomatis.`)) return;
    setVoidBusy(true);
    try {
      const { error } = await supabase
        .from("transaksi_penjualan")
        .update({ status_transaksi: "Dibatalkan", diubah_oleh: pengguna?.id_pengguna || null })
        .eq("id_transaksi", r.id_transaksi);
      if (error) throw new Error(error.message);
      setDetail(null);
      const { data } = await supabase
        .from("transaksi_penjualan")
        .select(`id_transaksi, tanggal_transaksi, total_pembayaran, diskon, metode_pembayaran, status_transaksi,
          detail_transaksi (jumlah_beli, subtotal, produk (nama_produk))`)
        .eq("id_transaksi", r.id_transaksi)
        .single();
      if (data) setRows((prev) => prev.map((x) => (x.id_transaksi === r.id_transaksi ? data : x)));
    } catch (e) {
      alert("Gagal membatalkan: " + (e.message || ""));
    } finally {
      setVoidBusy(false);
    }
  };

  const aktif = filtered.filter((r) => r.status_transaksi !== "Dibatalkan");
  const omset = aktif.reduce((s, r) => s + (+r.total_pembayaran || 0), 0);
  const pcs = aktif.reduce(
    (s, r) => s + (r.detail_transaksi || []).reduce((a, d) => a + (+d.jumlah_beli || 0), 0),
    0
  );

  const csv = () => {
    const head = "ID;Tanggal;Metode;Item;Total;Diskon\n";
    const lines = filtered.map((r) =>
      [
        r.id_transaksi,
        new Date(r.tanggal_transaksi).toLocaleString("id-ID"),
        `"${(r.metode_pembayaran || "").replace(/"/g, "")}"`,
        (r.detail_transaksi || []).reduce((a, d) => a + (+d.jumlah_beli || 0), 0),
        r.total_pembayaran,
        r.diskon || 0,
      ].join(";")
    );
    const blob = new Blob(["\uFEFF" + head + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-${from || "semua"}-${to || "semua"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Buku Besar Kasir
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold tracking-tight sm:text-[28px]">
              Riwayat Transaksi
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {filtered.length} nota • {pcs} pcs • omset {formatRupiah(omset)}
            </p>
          </div>
          <button type="button" onClick={csv} disabled={!filtered.length} className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-40">
            <Download size={16} /> Unduh CSV
          </button>
        </div>

        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-wrap gap-1.5">
            {[["hari-ini", "Hari Ini"], ["7-hari", "7 Hari"], ["bulan-ini", "Bulan Ini"], ["semua", "Semua"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => applyPreset(v)} className={`h-10 rounded-lg px-4 text-[13px] font-bold ${preset === v ? "bg-emerald-700 text-white shadow-sm" : "bg-[#eff4ff] text-slate-600 hover:bg-slate-200"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-lg bg-[#eff4ff] px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-600/25" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-lg bg-[#eff4ff] px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-600/25" />
            <label className="flex h-11 items-center gap-2 rounded-lg bg-[#eff4ff] px-3.5 focus-within:ring-2 focus-within:ring-emerald-600/25">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ID / metode / nominal…" className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" />
            </label>
          </div>
          {rangeErr && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-600">{rangeErr}</p>}
          {totalSemua !== null && totalSemua > rows.length && (
            <p className="mt-2 text-xs text-slate-500">Menampilkan {rows.length} dari {totalSemua} nota pada rentang ini.</p>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Memuat riwayat…</div>
        ) : error ? (
          <EmptyState icon={<ReceiptText size={24} />} title="Gagal" message={error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ReceiptText size={24} />} title="Kosong" message="Belum ada transaksi pada rentang ini." />
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60">
            <div className="nice-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-bold">ID & Jam</th>
                    <th className="px-4 py-3 font-bold">Isi</th>
                    <th className="px-4 py-3 font-bold">Metode</th>
                    <th className="px-4 py-3 text-right font-bold">Diskon</th>
                    <th className="px-4 py-3 text-right font-bold">Total Bayar</th>
                    <th className="px-5 py-3 text-right font-bold">Struk</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const metode = (r.metode_pembayaran || "").split("(")[0].trim();
                    return (
                      <tr key={r.id_transaksi} onClick={() => setDetail(r)} className="h-14 cursor-pointer border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-5 py-2.5">
                          <p className="font-mono text-xs font-bold">#{r.id_transaksi}</p>
                          <p className="text-[11px] text-slate-500">{formatTanggal(r.tanggal_transaksi, true)}</p>
                        </td>
                        <td className="max-w-[240px] truncate px-4 py-2.5 text-xs text-slate-500">
                          {(r.detail_transaksi || []).map((d) => `${d.produk?.nama_produk} ×${d.jumlah_beli}`).join(", ")}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone={metode === "Tunai" ? "blue" : "green"} dot={false}>{metode || "-"}</Badge>
                            {r.status_transaksi === "Dibatalkan" && <Badge tone="red" dot={false}>Dibatalkan</Badge>}
                          </div>
                        </td>
                        <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-xs text-slate-500">{+r.diskon > 0 ? formatRupiah(r.diskon) : "-"}</td>
                        <td className="tnum whitespace-nowrap px-4 py-2.5 text-right text-[13px] font-bold text-emerald-700">{formatRupiah(r.total_pembayaran)}</td>
                        <td className="px-5 py-2.5 text-right">
                          <span className="rounded-lg bg-[#eff4ff] px-2.5 py-1.5 text-[11px] font-bold text-slate-600">Rincian</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalSemua !== null && totalSemua > rows.length && (
              <button type="button" onClick={() => setBatas((b) => b + 300)} disabled={loading} className="w-full border-t border-slate-100 py-3.5 text-[13px] font-bold text-emerald-700 hover:bg-emerald-50/50 disabled:opacity-50">
                Muat {Math.min(300, totalSemua - rows.length)} nota lagi ({rows.length}/{totalSemua})
              </button>
            )}
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold">#{detail.id_transaksi}</p>
                <p className="text-[11px] text-slate-500">{formatTanggal(detail.tanggal_transaksi, true)} • {detail.metode_pembayaran}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Tutup" className="rounded-lg bg-slate-100 p-2 text-slate-500"><X size={16} /></button>
            </div>
            <div className="mt-3"><StrukNota data={toStruk(detail)} /></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => window.print()} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                <Printer size={15} /> Cetak Ulang
              </button>
              {detail.status_transaksi === "Dibatalkan" ? (
                <button type="button" onClick={() => setDetail(null)} className="h-12 rounded-lg bg-emerald-700 text-sm font-bold text-white">Tutup</button>
              ) : (
                <button type="button" onClick={() => voidNota(detail)} disabled={voidBusy} className="h-12 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                  {voidBusy ? "Membatalkan…" : "Void / Batalkan"}
                </button>
              )}
            </div>
            {detail.status_transaksi !== "Dibatalkan" && (
              <button type="button" onClick={() => setDetail(null)} className="mt-2 h-11 w-full rounded-lg bg-slate-100 text-[13px] font-bold text-slate-600 hover:bg-slate-200">
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
