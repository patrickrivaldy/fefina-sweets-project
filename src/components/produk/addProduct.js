"use client";

import { useState } from "react";

export default function AddProduct({ isOpen, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    nama_produk: "",
    hpp_estimasi: "",
    harga_jual: "",
    stok: "",
    deskripsi: "",
  });

  const [formError, setFormError] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.nama_produk.trim()) {
      setFormError("Nama produk wajib diisi.");
      return;
    }

    if (form.hpp_estimasi === "") {
      setFormError("HPP wajib diisi.");
      return;
    }

    if (form.harga_jual === "") {
      setFormError("Harga jual wajib diisi.");
      return;
    }

    if (form.stok === "") {
      setFormError("Stok wajib diisi.");
      return;
    }

    try {
      await onSubmit({
        nama_produk: form.nama_produk.trim(),
        hpp_estimasi: Number(form.hpp_estimasi),
        harga_jual: Number(form.harga_jual),
        stok: Number(form.stok),
        deskripsi: form.deskripsi.trim() || null,
        foto: null,
      });

      setForm({
        nama_produk: "",
        hpp_estimasi: "",
        harga_jual: "",
        stok: "",
        deskripsi: "",
      });

      onClose();
    } catch (error) {
      setFormError(error.message || "Produk gagal disimpan.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tambah Produk</h2>

            <p className="mt-1 text-sm text-slate-500">
              Masukkan informasi produk baru.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-3 py-2 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
            {/* Error */}
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            {/* Nama Produk */}
            <div>
              <label
                htmlFor="nama_produk"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nama Produk
              </label>

              <input
                id="nama_produk"
                name="nama_produk"
                type="text"
                value={form.nama_produk}
                onChange={handleChange}
                placeholder="Contoh: Manisan Mangga"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* HPP dan Harga Jual */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* HPP */}
              <div>
                <label
                  htmlFor="hpp_estimasi"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  HPP
                </label>

                <input
                  id="hpp_estimasi"
                  name="hpp_estimasi"
                  type="number"
                  min="0"
                  value={form.hpp_estimasi}
                  onChange={handleChange}
                  placeholder="Contoh: 10000"
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>

              {/* Harga Jual */}
              <div>
                <label
                  htmlFor="harga_jual"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Harga Jual
                </label>

                <input
                  id="harga_jual"
                  name="harga_jual"
                  type="number"
                  min="0"
                  value={form.harga_jual}
                  onChange={handleChange}
                  placeholder="Contoh: 15000"
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Stok */}
            <div>
              <label
                htmlFor="stok"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Stok
              </label>

              <input
                id="stok"
                name="stok"
                type="number"
                min="0"
                value={form.stok}
                onChange={handleChange}
                placeholder="Contoh: 50"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* Deskripsi */}
            <div>
              <label
                htmlFor="deskripsi"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Deskripsi
              </label>

              <textarea
                id="deskripsi"
                name="deskripsi"
                value={form.deskripsi}
                onChange={handleChange}
                placeholder="Masukkan deskripsi produk..."
                rows={4}
                disabled={submitting}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* Foto */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Foto Produk
              </label>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">
                  Upload foto akan diintegrasikan pada tahap Supabase Storage.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
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
              {submitting ? "Menyimpan..." : "Simpan Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
