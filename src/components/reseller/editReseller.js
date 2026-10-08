"use client";

import { useState } from "react";

export default function EditResellerModal({
  isOpen,
  reseller,
  onClose,
  onSubmit,
  submitting,
}) {
  const [form, setForm] = useState({
    nama_toko: reseller?.nama_toko || "",
    nama_pemilik: reseller?.nama_pemilik || "",
    no_whatsapp: reseller?.no_whatsapp || "",
    alamat: reseller?.alamat || "",
  });

  const [formError, setFormError] = useState("");

  if (!isOpen || !reseller) {
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

    if (!form.nama_toko.trim()) {
      setFormError("Nama toko wajib diisi.");
      return;
    }

    if (!form.nama_pemilik.trim()) {
      setFormError("Nama pemilik wajib diisi.");
      return;
    }

    if (!form.no_whatsapp.trim()) {
      setFormError("Nomor WhatsApp wajib diisi.");
      return;
    }

    if (!form.alamat.trim()) {
      setFormError("Alamat wajib diisi.");
      return;
    }

    try {
      await onSubmit({
        id_reseller: reseller.id_reseller,
        nama_toko: form.nama_toko.trim(),
        nama_pemilik: form.nama_pemilik.trim(),
        no_whatsapp: form.no_whatsapp.trim(),
        alamat: form.alamat.trim(),
      });
    } catch (error) {
      console.error(
        "Gagal memperbarui reseller:",
        error
      );

      setFormError(
        error.message ||
          "Reseller gagal diperbarui."
      );
    }
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }

    setFormError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Edit Reseller
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Perbarui informasi reseller.
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
          <div className="space-y-5 px-6 py-6">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">
                  {formError}
                </p>
              </div>
            )}

            {/* Nama Toko */}
            <div>
              <label
                htmlFor="edit_nama_toko"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nama Toko
              </label>

              <input
                id="edit_nama_toko"
                name="nama_toko"
                type="text"
                value={form.nama_toko}
                onChange={handleChange}
                placeholder="Contoh: Toko Oleh-Oleh Banyuwangi"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* Nama Pemilik */}
            <div>
              <label
                htmlFor="edit_nama_pemilik"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nama Pemilik
              </label>

              <input
                id="edit_nama_pemilik"
                name="nama_pemilik"
                type="text"
                value={form.nama_pemilik}
                onChange={handleChange}
                placeholder="Contoh: Budi"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* No. WhatsApp */}
            <div>
              <label
                htmlFor="edit_no_whatsapp"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                No. WhatsApp
              </label>

              <input
                id="edit_no_whatsapp"
                name="no_whatsapp"
                type="tel"
                value={form.no_whatsapp}
                onChange={handleChange}
                placeholder="Contoh: 081234567890"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            {/* Alamat */}
            <div>
              <label
                htmlFor="edit_alamat"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Alamat
              </label>

              <textarea
                id="edit_alamat"
                name="alamat"
                value={form.alamat}
                onChange={handleChange}
                placeholder="Masukkan alamat toko..."
                rows={4}
                disabled={submitting}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100"
              />
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