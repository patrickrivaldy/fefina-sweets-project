"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddProduct({ isOpen, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    nama_produk: "",
    hpp_estimasi: "",
    harga_jual: "",
    stok: "",
    deskripsi: "",
  });

  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

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

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageFile(null);
      setImagePreview("");
      setFormError("File yang dipilih harus berupa gambar.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError("");
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFormError("");
  };

  const resetForm = () => {
    setForm({
      nama_produk: "",
      hpp_estimasi: "",
      harga_jual: "",
      stok: "",
      deskripsi: "",
    });

    setImageFile(null);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview("");
    setFormError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    // =========================
    // VALIDASI FORM
    // =========================

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
      setFormError("HPP tidak boleh kurang dari 0.");
      return;
    }

    if (Number(form.harga_jual) < 0) {
      setFormError("Harga jual tidak boleh kurang dari 0.");
      return;
    }

    if (Number(form.stok) < 0) {
      setFormError("Stok tidak boleh kurang dari 0.");
      return;
    }

    try {
      // =========================
      // UPLOAD FOTO KE SUPABASE
      // =========================

      let photoUrl = null;

      if (imageFile) {
        const fileExtension =
          imageFile.name.split(".").pop()?.toLowerCase() || "jpg";

        const fileName = `${crypto.randomUUID()}.${fileExtension}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("FOTO-PRODUK")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: imageFile.type,
          });

        if (uploadError) {
          console.error("Gagal upload foto:", uploadError);
          throw new Error(
            uploadError.message || "Foto produk gagal diupload."
          );
        }

        // =========================
        // AMBIL PUBLIC URL FOTO
        // =========================

        const { data: publicUrlData } = supabase.storage
          .from("FOTO-PRODUK")
          .getPublicUrl(filePath);

        photoUrl = publicUrlData.publicUrl;
      }

      // =========================
      // INSERT DATA PRODUK
      // =========================

      await onSubmit({
        nama_produk: form.nama_produk.trim(),
        hpp_estimasi: Number(form.hpp_estimasi),
        harga_jual: Number(form.harga_jual),
        stok: Number(form.stok),
        deskripsi: form.deskripsi.trim() || null,
        foto: photoUrl,
      });

      // Reset form setelah INSERT berhasil
      resetForm();

      onClose();
    } catch (error) {
      console.error("Gagal menyimpan produk:", error);

      setFormError(error.message || "Produk gagal disimpan.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Tambah Produk
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Masukkan informasi produk baru.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
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
              <label
                htmlFor="foto"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Foto Produk
              </label>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <input
                  ref={fileInputRef}
                  id="foto"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={submitting}
                  className="block w-full text-sm text-slate-600"
                />

                {imagePreview && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Preview:
                    </p>

                    <img
                      src={imagePreview}
                      alt="Preview foto produk"
                      className="h-32 w-32 rounded-xl object-cover"
                    />

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={submitting}
                      className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Hapus Foto
                    </button>
                  </div>
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
              {submitting ? "Menyimpan..." : "Simpan Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}