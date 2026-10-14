"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/store/CartContext";
import { supabase } from "@/config/supabase";
import { formatRupiah, generateIdTransaksi } from "@/utils/format";
import { PEMBAYARAN_INFO } from "@/constants/app";
import RupiahInput from "@/components/ui/RupiahInput";
import StrukNota from "./StrukNota";
import {
  Minus,
  Plus,
  X,
  Pause,
  RotateCcw,
  Printer,
  Banknote,
  QrCode,
  Landmark,
  Receipt,
} from "lucide-react";

const TIPE = [
  { value: "Langsung", label: "Toko" },
  { value: "GoFood", label: "GoFood +25%" },
  { value: "GrabFood", label: "Grab +25%" },
];

const METODE = [
  { value: "Tunai", icon: Banknote },
  { value: "QRIS", icon: QrCode },
  { value: "Transfer", icon: Landmark },
];

const HOLD_KEY = "fefina-holds";

// Gambar QRIS toko (simpan file di public/qris.png). Kalau belum ada,
// tampil kotak petunjuk agar kasir tahu harus pasang gambar.
function QrisImage() {
  const [hilang, setHilang] = useState(false);
  if (hilang) {
    return (
      <div className="mx-auto mt-2 flex h-44 w-44 flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 text-center ring-1 ring-dashed ring-slate-300">
        <QrCode size={28} className="text-slate-300" />
        <p className="text-[11px] font-bold text-slate-500">Belum ada gambar QRIS</p>
        <p className="text-[10px] leading-snug text-slate-400">Simpan file QRIS sebagai public/qris.png lalu refresh.</p>
      </div>
    );
  }
  return (
    <img
      src={PEMBAYARAN_INFO.qrisImage}
      alt="QRIS Fefina Sweets"
      onError={() => setHilang(true)}
      className="mx-auto mt-2 h-44 w-44 rounded-xl bg-white object-contain p-2 ring-1 ring-slate-200"
    />
  );
}

export default function CartPanel({ onPaid }) {
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice } =
    useCart();
  const [tipe, setTipe] = useState("Langsung");
  const [metode, setMetode] = useState("Tunai");
  const [diskon, setDiskon] = useState("");
  const [uang, setUang] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [struk, setStruk] = useState(null);
  const [holds, setHolds] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(HOLD_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [showHolds, setShowHolds] = useState(false);

  const persistHolds = (h) => {
    setHolds(h);
    localStorage.setItem(HOLD_KEY, JSON.stringify(h));
  };

  const feeRate = tipe === "Langsung" ? 0 : 0.25;
  const diskonNum = Math.max(0, Number(diskon) || 0);
  const platform = Math.round(totalPrice * feeRate);
  const total = Math.max(0, totalPrice + platform - diskonNum);
  const uangNum = Number(uang) || 0;
  const tunai = metode === "Tunai";
  const cukup = !tunai || uangNum >= total;
  const kembali = tunai ? Math.max(0, uangNum - total) : 0;
  const count = useMemo(
    () => cartItems.reduce((s, i) => s + i.qty, 0),
    [cartItems]
  );

  const hold = () => {
    if (!cartItems.length || busy) return;
    persistHolds([
      ...holds,
      { id: Date.now(), at: new Date().toISOString(), items: cartItems },
    ]);
    clearCart();
    setUang("");
    setDiskon("");
  };

  const restoreHold = (h) => {
    clearCart();
    // kembalikan item satu per satu (addToCart menambah qty bila sudah ada)
    setTimeout(() => {
      h.items.forEach((it) => {
        for (let i = 0; i < it.qty; i++) addToCart(it);
      });
    }, 0);
    persistHolds(holds.filter((x) => x.id !== h.id));
    setShowHolds(false);
  };

  const bayar = async () => {
    if (!cartItems.length || busy) return;
    if (tunai && uangNum < total) {
      setError(`Uang kurang ${formatRupiah(total - uangNum)}.`);
      return;
    }
    setBusy(true);
    setError("");
    const id_transaksi = generateIdTransaksi();
    try {
      const ids = cartItems.map((i) => i.id_produk);
      const { data: fresh, error: sErr } = await supabase
        .from("produk")
        .select("id_produk, stok, nama_produk")
        .in("id_produk", ids);
      if (sErr) throw new Error("Gagal cek stok: " + sErr.message);
      for (const it of cartItems) {
        const p = fresh?.find((x) => x.id_produk === it.id_produk);
        if (!p) throw new Error(`${it.nama_produk} tidak ditemukan.`);
        if (p.stok < it.qty)
          throw new Error(`${p.nama_produk} sisa ${p.stok}, minta ${it.qty}.`);
      }
      const { error: tErr } = await supabase.from("transaksi_penjualan").insert([
        {
          id_transaksi,
          total_pembayaran: total,
          diskon: diskonNum,
          metode_pembayaran: `${metode} (${tipe})`,
        },
      ]);
      if (tErr) throw new Error("Gagal simpan transaksi: " + tErr.message);
      // Harga, HPP (blended FIFO), subtotal & pemotongan stok dihitung
      // otomatis oleh trigger database — cukup kirim produk & jumlah beli.
      const details = cartItems.map((it) => ({
        id_transaksi,
        id_produk: it.id_produk,
        jumlah_beli: it.qty,
      }));
      const { error: dErr } = await supabase
        .from("detail_transaksi")
        .insert(details);
      if (dErr) {
        await supabase.from("transaksi_penjualan").delete().eq("id_transaksi", id_transaksi);
        throw new Error("Gagal simpan rincian: " + dErr.message);
      }
      setStruk({
        id_transaksi,
        tanggal: new Date().toISOString(),
        items: cartItems.map((i) => ({
          nama_produk: i.nama_produk,
          qty: i.qty,
          harga_jual: i.harga_jual,
          subtotal: i.harga_jual * i.qty,
        })),
        subtotal: totalPrice,
        biayaPlatform: platform,
        tipePenjualan: tipe,
        diskon: diskonNum,
        total,
        metode,
        uang: tunai ? uangNum : total,
        kembalian: kembali,
      });
      clearCart();
      setUang("");
      setDiskon("");
      if (onPaid) onPaid();
    } catch (e) {
      const msg = e.message || "Pembayaran gagal.";
      setError(msg);
      // Kalau gagal karena stok (data snapshot basi), segarkan daftar produk.
      if (/stok|sisa|tidak ditemukan/i.test(msg) && onPaid) onPaid();
    } finally {
      setBusy(false);
    }
  };

  if (struk) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
          Pembayaran berhasil
        </p>
        <p className="tnum mt-1 font-mono text-xs font-bold">{struk.id_transaksi}</p>
        <p className="tnum mt-1 text-3xl font-bold text-emerald-700">
          {formatRupiah(struk.total)}
        </p>
        {struk.kembalian > 0 && (
          <p className="tnum mt-1 text-sm font-bold text-slate-700">
            Kembali {formatRupiah(struk.kembalian)}
          </p>
        )}
        <div className="mt-3">
          <StrukNota data={struk} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            <Printer size={16} /> Cetak Struk
          </button>
          <button
            type="button"
            onClick={() => setStruk(null)}
            className="h-12 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Selesai — Transaksi Baru
          </button>
        </div>
        <div className="hidden print:block">
          <StrukNota data={struk} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        Pesanan Aktif
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Keranjang Kasir</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setShowHolds(!showHolds)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#eff4ff] px-3 text-xs font-bold text-slate-600 hover:bg-slate-200"
            title="Tahan / ambil pesanan"
          >
            <Pause size={13} /> Hold{holds.length > 0 && ` (${holds.length})`}
          </button>
          <button
            type="button"
            onClick={() => {
              if (cartItems.length && window.confirm("Reset keranjang?")) {
                clearCart();
                setUang("");
                setDiskon("");
              }
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-600 hover:bg-red-100"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {showHolds && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2.5">
          {holds.length === 0 ? (
            <p className="px-1 py-1 text-xs text-slate-500">
              Belum ada pesanan ditahan.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {holds.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs ring-1 ring-slate-200"
                >
                  <span className="flex-1 font-semibold">
                    {new Date(h.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {h.items.reduce((s, i) => s + i.qty, 0)} item
                  </span>
                  <button
                    type="button"
                    onClick={() => restoreHold(h)}
                    className="rounded-md bg-emerald-700 px-2.5 py-1 font-bold text-white"
                  >
                    Ambil
                  </button>
                  <button
                    type="button"
                    onClick={() => persistHolds(holds.filter((x) => x.id !== h.id))}
                    className="rounded-md px-1.5 py-1 text-slate-400 hover:text-red-600"
                    aria-label="Hapus hold"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="nice-scroll mt-3 max-h-[300px] space-y-2 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="rounded-lg bg-[#eff4ff] p-5 text-center">
            <Receipt size={22} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] font-bold text-slate-600">
              Keranjang kosong
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Klik tombol + pada produk untuk menambah.
            </p>
          </div>
        ) : (
          cartItems.map((it) => {
            const sub = it.harga_jual * it.qty;
            const max = it.qty >= it.stok;
            return (
              <div key={it.id_produk} className="rounded-lg bg-[#eff4ff] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-bold">
                    {it.nama_produk}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(it.id_produk)}
                    aria-label="Hapus"
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p className="tnum mt-0.5 text-xs text-slate-500">
                  Rp {it.harga_jual.toLocaleString("id-ID")} /pcs
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 rounded-lg bg-white px-1.5 py-1 ring-1 ring-slate-200">
                    <button
                      type="button"
                      aria-label="Kurangi"
                      disabled={it.qty <= 1}
                      onClick={() => updateQuantity(it.id_produk, it.qty - 1)}
                      className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="tnum w-5 text-center text-[13px] font-bold">
                      {it.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah"
                      disabled={max}
                      title={max ? `Mentok (${it.stok})` : "Tambah"}
                      onClick={() => updateQuantity(it.id_produk, it.qty + 1)}
                      className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <Plus size={13} />
                    </button>
                  </span>
                  <span className="tnum text-sm font-bold">
                    Rp{sub.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            );
          }))}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal ({count} Item)</span>
          <span className="tnum font-bold">{formatRupiah(totalPrice)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">Diskon Promosi</span>
          <span className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-400">Rp</span>
            <RupiahInput
              value={diskon}
              onChange={setDiskon}
              placeholder="0"
              className="tnum h-9 w-28 rounded-lg bg-[#eff4ff] px-2.5 text-right text-sm font-bold outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/25"
            />
          </span>
        </div>
        {platform > 0 && (
          <div className="flex justify-between text-xs text-slate-500">
            <span>Biaya {tipe} 25%</span>
            <span className="tnum font-bold">{formatRupiah(platform)}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 rounded-xl bg-emerald-50/70 p-3.5 ring-1 ring-emerald-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Pembayaran
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Sudah termasuk {tipe === "Langsung" ? "tanpa biaya platform" : "biaya platform 25%"}
            </p>
          </div>
          <p className="tnum text-right text-[32px] font-bold leading-10 tracking-tight text-emerald-700">
            {formatRupiah(total).replace("Rp", "Rp ")}
          </p>
        </div>
      </div>

      <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        Pilih Metode Pembayaran
      </p>
      <div className="grid grid-cols-3 gap-2">
        {METODE.map((m) => {
          const Icon = m.icon;
          const activeM = metode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetode(m.value)}
              className={`flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold transition ${
                activeM
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-[#eff4ff] text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon size={19} />
              {m.value}
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {TIPE.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTipe(t.value)}
              className={`h-9 rounded-lg text-[11px] font-bold transition ${
                tipe === t.value
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tunai && (
        <>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[13px] text-slate-500">Uang Diterima</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setUang(String(Math.ceil(total / 50000) * 50000))}
                className="rounded-md bg-[#eff4ff] px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
              >
                Pas Rp {Math.ceil(total / 50000) * 50000 > 0 ? `${Math.ceil(total / 1000)}rb` : ""}
              </button>
              <button
                type="button"
                onClick={() => setUang(String(total))}
                className="rounded-md bg-[#eff4ff] px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
              >
                Uang Pas
              </button>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-[#eff4ff] px-3.5 py-3">
            <span className="text-sm font-bold text-slate-500">Rp</span>
            <RupiahInput
              value={uang}
              onChange={setUang}
              placeholder="150.000"
              className="tnum w-full bg-transparent text-xl font-bold outline-none placeholder:text-slate-300"
            />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50/60 px-3.5 py-2.5 ring-1 ring-amber-100">
            <span className="text-[13px] text-slate-500">Uang Kembalian</span>
            <span className={`tnum text-lg font-bold ${cukup && uang !== "" ? "text-emerald-700" : "text-slate-400"}`}>
              {uang === "" ? formatRupiah(0) : formatRupiah(kembali)}
            </span>
          </div>
          {uang !== "" && !cukup && (
            <p className="mt-1.5 text-xs font-bold text-red-600">
              Kurang {formatRupiah(total - uangNum)}
            </p>
          )}
        </>
      )}

      {!tunai && (
        <div className="mt-3 rounded-xl bg-emerald-50/70 p-4 text-center ring-1 ring-emerald-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {metode === "QRIS" ? "Scan QRIS berikut" : `Transfer ke ${PEMBAYARAN_INFO.bankNama}`}
          </p>
          {metode === "QRIS" ? (
            <>
              <QrisImage />
              <p className="mt-1.5 text-xs font-bold">{PEMBAYARAN_INFO.qrisNama}</p>
            </>
          ) : (
            <div className="mt-2 rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200">
              <p className="tnum text-xl font-bold tracking-wider">{PEMBAYARAN_INFO.bankNorek}</p>
              <p className="mt-0.5 text-xs text-slate-500">a.n. {PEMBAYARAN_INFO.bankPemilik} • {PEMBAYARAN_INFO.bankNama}</p>
            </div>
          )}
          <p className="tnum mt-2 text-lg font-bold text-emerald-700">{formatRupiah(total)}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Tunjukkan bukti bayar ke kasir, lalu selesaikan pembayaran.</p>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={bayar}
        disabled={!cartItems.length || !cukup || busy}
        className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400"
      >
        <Printer size={17} />
        {busy ? "Memproses…" : "Selesaikan Pembayaran"}
      </button>
      <button
        type="button"
        onClick={hold}
        disabled={!cartItems.length || busy}
        title="Tahan keranjang ini (misal pelanggan ke ATM dulu), ambil lagi lewat tombol Hold di atas"
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#eff4ff] text-[13px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
      >
        Simpan Pesanan / Hold Bill
      </button>
      <p className="mt-1.5 text-center text-[11px] text-slate-400">Hold = tahan pesanan belum bayar, bisa dilanjut nanti.</p>
    </div>
  );
}
