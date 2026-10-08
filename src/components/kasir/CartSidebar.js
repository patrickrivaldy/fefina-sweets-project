"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import CheckoutModal from "@/components/kasir/CheckoutModal";

export default function CartSidebar({ onCheckoutSuccess }) {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice,
  } = useCart();

  const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Keranjang
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {totalItems} item
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">
            🛒
          </div>
        </div>
      </div>

      {/* Isi Keranjang */}
      <div className="max-h-[520px] overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
              🛒
            </div>

            <h3 className="mt-5 text-sm font-semibold text-slate-800">
              Keranjang masih kosong
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Pilih produk dari daftar untuk menambahkannya
              ke keranjang.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cartItems.map((item) => {
              const subtotal =
                item.harga_jual * item.qty;

              const isMinQuantity = item.qty <= 1;
              const isMaxQuantity =
                item.qty >= item.stok;

              return (
                <div
                  key={item.id_produk}
                  className="p-4"
                >
                  <div className="flex gap-3">
                    {/* Foto Produk */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50">
                      {item.foto ? (
                        <img
                          src={item.foto}
                          alt={item.nama_produk}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">
                          🍊
                        </span>
                      )}
                    </div>

                    {/* Informasi Produk */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">
                          {item.nama_produk}
                        </h3>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.id_produk
                            )
                          }
                          className="shrink-0 text-xs font-medium text-red-500 transition hover:text-red-600"
                        >
                          Hapus
                        </button>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatRupiah(item.harga_jual)}
                        {" / item"}
                      </p>

                      {/* Kontrol Quantity */}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
                          {/* Kurang */}
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.id_produk,
                                item.qty - 1
                              )
                            }
                            disabled={isMinQuantity}
                            className="flex h-8 w-8 items-center justify-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                          >
                            −
                          </button>

                          {/* Quantity */}
                          <span className="flex h-8 min-w-9 items-center justify-center border-x border-slate-200 px-2 text-sm font-semibold text-slate-800">
                            {item.qty}
                          </span>

                          {/* Tambah */}
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.id_produk,
                                item.qty + 1
                              )
                            }
                            disabled={isMaxQuantity}
                            className="flex h-8 w-8 items-center justify-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <p className="text-sm font-bold text-slate-900">
                          {formatRupiah(subtotal)}
                        </p>
                      </div>

                      {/* Info stok */}
                      <p className="mt-2 text-xs text-slate-400">
                        Stok tersedia: {item.stok}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="border-t border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Total
          </span>

          <span className="text-lg font-bold text-slate-900">
            {formatRupiah(totalPrice)}
          </span>
        </div>

        <button
          type="button"
          disabled={cartItems.length === 0}
          onClick={() => setShowCheckoutModal(true)}
          className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Checkout
        </button>
      </div>
        {showCheckoutModal && (
          <CheckoutModal
          totalPrice={totalPrice}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={onCheckoutSuccess}
        />
)}
    </div>
  );
}