"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CheckoutModal({
  totalPrice,
  onClose,
  onSuccess,
}) {
  const [uangPelanggan, setUangPelanggan] = useState("");
  const [processing, setProcessing] = useState(false);

  const { cartItems, clearCart } = useCart();

  const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const uang = Number(uangPelanggan) || 0;
  const kembalian = uang - totalPrice;
  const uangKurang = totalPrice - uang;

  const isSufficient = uang >= totalPrice;

  const handlePayment = async () => {
    if (!isSufficient || processing) {
      return;
    }

    setProcessing(true);

    try {
      // =========================
      // DATA KERANJANG (ARRAY)
      // =========================
      const cartData = cartItems.map((item) => ({
        id_produk: item.id_produk,
        qty: item.qty,
        harga_jual: item.harga_jual,
        subtotal: item.harga_jual * item.qty,
      }));

      console.log("Data keranjang yang siap dikirim:", cartData);

      // Simulasi proses pengiriman data
      // API Supabase akan diintegrasikan setelah
      // bagian backend transaksi selesai.

      console.log("Total pembayaran:", totalPrice);
      console.log("Uang pelanggan:", uang);
      console.log("Kembalian:", kembalian);

      // Simulasi pembayaran berhasil
      alert("Pembayaran berhasil diproses.");

      clearCart();

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      alert("Terjadi kesalahan saat memproses pembayaran.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Checkout
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Masukkan uang yang diberikan pelanggan
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        {/* Isi Modal */}
        <div className="space-y-5 p-6">

          {/* Total Belanja */}
          <div className="rounded-xl bg-orange-50 p-4">
            <p className="text-xs font-medium text-orange-600">
              Total Belanja
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatRupiah(totalPrice)}
            </p>
          </div>

          {/* Input Uang Pelanggan */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Uang Pelanggan
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                Rp
              </span>

              <input
                type="number"
                min="0"
                value={uangPelanggan}
                onChange={(event) =>
                  setUangPelanggan(event.target.value)
                }
                placeholder="Masukkan nominal uang"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* Kembalian */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Kembalian
              </span>

              <span
                className={`text-lg font-bold ${
                  isSufficient
                    ? "text-green-600"
                    : "text-slate-900"
                }`}
              >
                {isSufficient
                  ? formatRupiah(kembalian)
                  : formatRupiah(0)}
              </span>
            </div>

            {!isSufficient && uangPelanggan !== "" && (
              <p className="mt-2 text-xs font-medium text-red-500">
                Uang pelanggan kurang {formatRupiah(uangKurang)}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handlePayment}
            disabled={!isSufficient || processing}
            className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {processing ? "Memproses..." : "Bayar"}
          </button>
        </div>

      </div>
    </div>
  );
}