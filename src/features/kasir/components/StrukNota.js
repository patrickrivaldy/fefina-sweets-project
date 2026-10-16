"use client";

import { formatRupiah, formatTanggal } from "@/utils/format";

export default function StrukNota({ data }) {
  if (!data) return null;
  const {
    id_transaksi,
    tanggal,
    items = [],
    subtotal,
    biayaPlatform,
    tipePenjualan,
    diskon,
    total,
    metode,
    uang,
    kembalian,
  } = data;

  return (
    <div id="struk-area" className="bg-white text-stone-900">
      <div className="mx-auto max-w-[300px] border border-dashed border-stone-300 p-4">
        <div className="text-center leading-tight">
          <p className="text-base font-extrabold tracking-tight">FEFINA SWEETS</p>
          <p className="mt-0.5 text-[11px] text-stone-500">Manisan Buah Kering</p>
          <p className="mt-2 font-mono text-[11px] font-bold">{id_transaksi}</p>
          <p className="text-[11px] text-stone-500">
            {formatTanggal(tanggal, true)} · {tipePenjualan} · {metode}
          </p>
        </div>
        <div className="my-3 border-t border-dashed border-stone-300" />
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{it.nama_produk}</p>
                <p className="text-stone-500">
                  {it.qty} × {formatRupiah(it.harga_jual)}
                </p>
              </div>
              <p className="font-bold tabular-nums">{formatRupiah(it.subtotal)}</p>
            </div>
          ))}
        </div>
        <div className="my-3 border-t border-dashed border-stone-300" />
        <dl className="space-y-1 text-xs tabular-nums">
          <div className="flex justify-between">
            <dt className="text-stone-500">Subtotal</dt>
            <dd className="font-semibold">{formatRupiah(subtotal)}</dd>
          </div>
          {biayaPlatform > 0 && (
            <div className="flex justify-between">
              <dt className="text-stone-500">Platform 25%</dt>
              <dd className="font-semibold">{formatRupiah(biayaPlatform)}</dd>
            </div>
          )}
          {diskon > 0 && (
            <div className="flex justify-between">
              <dt className="text-stone-500">Diskon</dt>
              <dd className="font-semibold">−{formatRupiah(diskon)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 text-sm font-extrabold">
            <dt>Total</dt>
            <dd>{formatRupiah(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Bayar</dt>
            <dd>{formatRupiah(uang)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Kembali</dt>
            <dd>{formatRupiah(kembalian)}</dd>
          </div>
        </dl>
        <div className="my-3 border-t border-dashed border-stone-300" />
        <p className="text-center text-[11px] text-stone-500">
          Terima kasih sudah berbelanja.
        </p>
      </div>
    </div>
  );
}
