"use client";

import { useRef, useState } from "react";

export default function EditProduct({
  isOpen,
  product,
  onClose,
  onSubmit,
  submitting,
}) {
  const [form, setForm] = useState({
    nama_produk: product?.nama_produk || "",
    hpp_estimasi: product?.hpp_estimasi ?? "",
    harga_jual: product?.harga_jual ?? "",
    stok: product?.stok ?? "",
    deskripsi: product?.deskripsi || "",
  });

  const [formError, setFormError] = useState("");

  // =========================
  // FOTO PRODUK
  // =========================
  const [imageFile, setImageFile] = useState(null);

  const [imagePreview, setImagePreview] = useState(
    product?.foto || ""
  );

  const fileInputRef = useRef(null);

  // =========================
  // RESET FORM
  // =========================
  const resetForm = () => {
    setForm({
      nama_produk: "",
      hpp_estimasi: "",
      harga_jual: "",
      stok: "",
      deskripsi: "",
    });

    setFormError("");

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================
  // TUTUP MODAL
  // =========================
  const handleClose = () => {
    if (submitting) {
      return;
    }

    resetForm();
    onClose();
  };

  if (!isOpen || !product) {
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

  // =========================
  // PILIH FOTO BARU
  // =========================
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageFile(null);
      setFormError(
        "File yang dipilih harus berupa gambar."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError("");
  };

  // =========================
  // BATAL GANTI FOTO
  // =========================
  const handleRemoveImage = () => {
    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);

    setImagePreview(product?.foto || "");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFormError("");
  };

  // =========================
  // SUBMIT UPDATE
  // =========================
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

    if (Number(form.hpp_estimasi) < 0) {
      setFormError(
        "HPP tidak boleh kurang dari 0."
      );
      return;
    }

    if (Number(form.harga_jual) < 0) {
      setFormError(
        "Harga jual tidak boleh kurang dari 0."
      );
      return;
    }

    if (Number(form.stok) < 0) {
      setFormError(
        "Stok tidak boleh kurang dari 0."
      );
      return;
    }

    try {
      await onSubmit({
        id_produk: product.id_produk,
        nama_produk: form.nama_produk.trim(),
        hpp_estimasi: Number(form.hpp_estimasi),
        harga_jual: Number(form.harga_jual),
        stok: Number(form.stok),
        deskripsi:
          form.deskripsi.trim() || null,
        imageFile,
      });

      // Reset form setelah update berhasil
      resetForm();
    } catch (error) {
      console.error(
        "Gagal memperbarui produk:",
        error
      );

      setFormError(
        error.message ||
          "Produk gagal diperbarui."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Edit Produk
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Perbarui informasi produk.
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
            {/* Error */}
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">
                  {formError}
                </p>
              </div>
            )}

            {/* Nama Produk */}
            <div>
              <label
                htmlFor="edit_nama_produk"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nama Produk
              </label>

              <input
                id="edit_nama_produk"
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
              <div>
                <label
                  htmlFor="edit_hpp_estimasi"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  HPP
                </label>

                <input
                  id="edit_hpp_estimasi"
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

              <div>
                <label
                  htmlFor="edit_harga_jual"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Harga Jual
                </label>

                <input
                  id="edit_harga_jual"
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
                htmlFor="edit_stok"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Stok
              </label>

              <input
                id="edit_stok"
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
                htmlFor="edit_deskripsi"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Deskripsi
              </label>

              <textarea
                id="edit_deskripsi"
                name="deskripsi"
                value={form.deskripsi}
                onChange={handleChange}
                placeholder="Masukkan deskripsi produk..."
                rows={4}
                disabled={submitting}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* Foto Produk */}
            <div>
              <label
                htmlFor="edit_foto"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Foto Produk
              </label>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <input
                  ref={fileInputRef}
                  id="edit_foto"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={submitting}
                  className="block w-full text-sm text-slate-600"
                />

                {imagePreview && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Preview Foto:
                    </p>

                    <img
                      src={imagePreview}
                      alt={product.nama_produk}
                      className="h-32 w-32 rounded-xl object-cover"
                    />

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={submitting}
                      className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Batal Ganti Foto
                    </button>
                  </div>
                )}

                {!imagePreview && (
                  <p className="mt-3 text-sm text-slate-400">
                    Belum ada foto produk.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
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
                : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}