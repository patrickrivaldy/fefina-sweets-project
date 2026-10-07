"use client";

import { useState } from "react";

export default function AddKonsinyasiModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  resellers,
  products,
}) {
  const [form, setForm] = useState({
    id_reseller: "",
    id_produk: "",
    tanggal_titip: new Date()
      .toISOString()
      .split("T")[0],
    jumlah_titip: "",
    jumlah_laku: "0",
    status_pembayaran: "Belum Lunas",
  });

  const [formError, setFormError] = useState("");

  if (!isOpen) {
    return null;
  }

  const selectedProduct = products.find(
    (product) =>
      product.id_produk === form.id_produk
  );

  const hargaJual =
    selectedProduct?.harga_jual || 0;

  const jumlahLaku =
    Number(form.jumlah_laku) || 0;

  const subtotal = hargaJual * jumlahLaku;

  // =========================
  // HANDLE CHANGE
  // =========================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError("");
  };

  // =========================
  // HANDLE SUBMIT
  // =========================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");

    const jumlahTitip =
      Number(form.jumlah_titip) || 0;

    const jumlahLaku =
      Number(form.jumlah_laku) || 0;

    // Validasi reseller
    if (!form.id_reseller) {
      setFormError("Reseller wajib dipilih.");
      return;
    }

    // Validasi produk
    if (!form.id_produk) {
      setFormError("Produk wajib dipilih.");
      return;
    }

    // Validasi tanggal
    if (!form.tanggal_titip) {
      setFormError("Tanggal titip wajib diisi.");
      return;
    }

    // Validasi jumlah titip
    if (jumlahTitip <= 0) {
      setFormError(
        "Jumlah titip harus lebih dari 0."
      );
      return;
    }

    // Validasi jumlah laku
    if (jumlahLaku < 0) {
      setFormError(
        "Jumlah laku tidak boleh kurang dari 0."
      );
      return;
    }

    // Jumlah laku tidak boleh melebihi jumlah titip
    if (jumlahLaku > jumlahTitip) {
      setFormError(
        "Jumlah laku tidak boleh lebih dari jumlah titip."
      );
      return;
    }

    try {
      await onSubmit({
        id_reseller: form.id_reseller,
        id_produk: form.id_produk,
        tanggal_titip: form.tanggal_titip,
        jumlah_titip: jumlahTitip,
        jumlah_laku: jumlahLaku,
        subtotal,
        status_pembayaran:
          form.status_pembayaran,
      });

      // =========================
      // RESET FORM
      // =========================
      setForm({
        id_reseller: "",
        id_produk: "",
        tanggal_titip: new Date()
          .toISOString()
          .split("T")[0],
        jumlah_titip: "",
        jumlah_laku: "0",
        status_pembayaran: "Belum Lunas",
      });

      setFormError("");
    } catch (error) {
      console.error(
        "Gagal menambahkan konsinyasi:",
        error
      );

      setFormError(
        error.message ||
          "Konsinyasi gagal ditambahkan."
      );
    }
  };

  // =========================
  // HANDLE CLOSE
  // =========================
  const handleClose = () => {
    if (submitting) {
      return;
    }

    // Reset form ketika modal ditutup
    setForm({
      id_reseller: "",
      id_produk: "",
      tanggal_titip: new Date()
        .toISOString()
        .split("T")[0],
      jumlah_titip: "",
      jumlah_laku: "0",
      status_pembayaran: "Belum Lunas",
    });

    setFormError("");

    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        {/* =========================
            HEADER
        ========================= */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Tambah Konsinyasi
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tambahkan data penitipan produk kepada reseller.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg px-3 py-2 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {/* =========================
            FORM
        ========================= */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {/* Error */}
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">
                  {formError}
                </p>
              </div>
            )}

            {/* =========================
                RESELLER
            ========================= */}
            <div>
              <label
                htmlFor="id_reseller"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Reseller
              </label>

              <select
                id="id_reseller"
                name="id_reseller"
                value={form.id_reseller}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              >
                <option value="">
                  Pilih reseller
                </option>

                {resellers.map((reseller) => (
                  <option
                    key={reseller.id_reseller}
                    value={reseller.id_reseller}
                  >
                    {reseller.nama_toko}
                  </option>
                ))}
              </select>
            </div>

            {/* =========================
                PRODUK
            ========================= */}
            <div>
              <label
                htmlFor="id_produk"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Produk
              </label>

              <select
                id="id_produk"
                name="id_produk"
                value={form.id_produk}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              >
                <option value="">
                  Pilih produk
                </option>

                {products.map((product) => (
                  <option
                    key={product.id_produk}
                    value={product.id_produk}
                  >
                    {product.nama_produk} -{" "}
                    {new Intl.NumberFormat(
                      "id-ID"
                    ).format(
                      product.harga_jual || 0
                    )}
                  </option>
                ))}
              </select>
            </div>

            {/* =========================
                TANGGAL TITIP
            ========================= */}
            <div>
              <label
                htmlFor="tanggal_titip"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Tanggal Titip
              </label>

              <input
                id="tanggal_titip"
                name="tanggal_titip"
                type="date"
                value={form.tanggal_titip}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* =========================
                JUMLAH TITIP
            ========================= */}
            <div>
              <label
                htmlFor="jumlah_titip"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Jumlah Titip
              </label>

              <input
                id="jumlah_titip"
                name="jumlah_titip"
                type="number"
                min="1"
                value={form.jumlah_titip}
                onChange={handleChange}
                placeholder="Masukkan jumlah produk"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* =========================
                JUMLAH LAKU
            ========================= */}
            <div>
              <label
                htmlFor="jumlah_laku"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Jumlah Laku
              </label>

              <input
                id="jumlah_laku"
                name="jumlah_laku"
                type="number"
                min="0"
                max={
                  form.jumlah_titip || undefined
                }
                value={form.jumlah_laku}
                onChange={handleChange}
                placeholder="Masukkan jumlah produk terjual"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* =========================
                STATUS PEMBAYARAN
            ========================= */}
            <div>
              <label
                htmlFor="status_pembayaran"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Status Pembayaran
              </label>

              <select
                id="status_pembayaran"
                name="status_pembayaran"
                value={form.status_pembayaran}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              >
                <option value="Belum Lunas">
                  Belum Lunas
                </option>

                <option value="Lunas">
                  Lunas
                </option>
              </select>
            </div>

            {/* =========================
                TOTAL TAGIHAN
            ========================= */}
            <div className="rounded-xl bg-orange-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Total Tagihan
                </span>

                <span className="text-lg font-bold text-orange-600">
                  Rp{" "}
                  {new Intl.NumberFormat(
                    "id-ID"
                  ).format(subtotal)}
                </span>
              </div>
            </div>
          </div>

          {/* =========================
              FOOTER
          ========================= */}
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Menyimpan..."
                : "Simpan Konsinyasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}