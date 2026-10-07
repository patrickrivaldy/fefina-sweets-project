"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AddResellerModal from "@/components/konsinyasi/addReseller";
import EditResellerModal from "@/components/konsinyasi/editReseller";
import { supabase } from "@/lib/supabase";

export default function KonsinyasiPage() {
  const [search, setSearch] = useState("");
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedReseller, setSelectedReseller] =
    useState(null);

  const [submitting, setSubmitting] = useState(false);

  // =========================
  // GET / READ DATA RESELLER
  // =========================
  useEffect(() => {
    const loadResellers = async () => {
      const { data, error } = await supabase
        .from("resellers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Gagal mengambil data reseller:",
          error
        );

        setError("Data reseller gagal dimuat.");
        setResellers([]);
      } else {
        setResellers(data || []);
        setError("");
      }

      setLoading(false);
    };

    loadResellers();
  }, []);

  // =========================
  // INSERT / TAMBAH RESELLER
  // =========================
  const handleAddReseller = async (resellerData) => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("resellers")
        .insert([resellerData]);

      if (error) {
        console.error(
          "Gagal menambahkan reseller:",
          error
        );

        throw new Error(
          error.message ||
            "Reseller gagal ditambahkan ke database."
        );
      }

      // =========================
      // AMBIL KEMBALI DATA RESELLER
      // =========================
      const { data, error: fetchError } =
        await supabase
          .from("resellers")
          .select("*")
          .eq("is_active", true)
          .order("created_at", {
            ascending: false,
          });

      if (fetchError) {
        console.error(
          "Reseller berhasil ditambahkan, tetapi gagal memuat ulang data:",
          fetchError
        );

        throw new Error(
          "Reseller berhasil ditambahkan, tetapi data tabel gagal diperbarui."
        );
      }

      setResellers(data || []);

      // =========================
      // TUTUP MODAL
      // =========================
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // PILIH RESELLER UNTUK EDIT
  // =========================
  const handleEditReseller = (reseller) => {
    setSelectedReseller(reseller);
    setShowEditModal(true);
  };

  // =========================
  // UPDATE / EDIT RESELLER
  // =========================
  const handleEditResellerSubmit = async (
    resellerData
  ) => {
    setSubmitting(true);

    try {
      const {
        id_reseller,
        ...updateData
      } = resellerData;

      const { error } = await supabase
        .from("resellers")
        .update(updateData)
        .eq("id_reseller", id_reseller);

      if (error) {
        console.error(
          "Gagal memperbarui reseller:",
          error
        );

        throw new Error(
          error.message ||
            "Reseller gagal diperbarui."
        );
      }

      // =========================
      // AMBIL ULANG DATA RESELLER
      // =========================
      const { data, error: fetchError } =
        await supabase
          .from("resellers")
          .select("*")
          .eq("is_active", true)
          .order("created_at", {
            ascending: false,
          });

      if (fetchError) {
        console.error(
          "Reseller berhasil diperbarui, tetapi gagal memuat ulang data:",
          fetchError
        );

        throw new Error(
          "Reseller berhasil diperbarui, tetapi data tabel gagal diperbarui."
        );
      }

      setResellers(data || []);

      // =========================
      // TUTUP MODAL
      // =========================
      setShowEditModal(false);
      setSelectedReseller(null);
    } catch (error) {
      console.error(
        "Gagal memperbarui reseller:",
        error
      );

      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
// HAPUS / NONAKTIFKAN RESELLER
// =========================
const handleDeleteReseller = async (reseller) => {
  const confirmed = window.confirm(
    `Apakah Anda yakin ingin menghapus reseller "${reseller.nama_toko}"?`
  );

  if (!confirmed) {
    return;
  }

  setSubmitting(true);

  try {
    const { error } = await supabase
      .from("resellers")
      .update({
        is_active: false,
      })
      .eq("id_reseller", reseller.id_reseller);

    if (error) {
      console.error(
        "Gagal menghapus reseller:",
        error
      );

      throw new Error(
        error.message ||
          "Reseller gagal dihapus."
      );
    }

    // =========================
    // AMBIL ULANG DATA RESELLER AKTIF
    // =========================
    const { data, error: fetchError } =
      await supabase
        .from("resellers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", {
          ascending: false,
        });

    if (fetchError) {
      console.error(
        "Reseller berhasil dinonaktifkan, tetapi gagal memuat ulang data:",
        fetchError
      );

      throw new Error(
        "Reseller berhasil dihapus, tetapi data tabel gagal diperbarui."
      );
    }

    setResellers(data || []);
  } catch (error) {
    console.error(
      "Gagal menghapus reseller:",
      error
    );

    alert(
      error.message ||
        "Reseller gagal dihapus."
    );
  } finally {
    setSubmitting(false);
  }
};

  // =========================
  // FILTER SEARCH
  // =========================
  const filteredResellers = resellers.filter(
    (reseller) =>
      reseller.nama_toko
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header halaman */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reseller
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Kelola data reseller atau agen konsinyasi Fefina Sweets.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari nama toko..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          {/* Tambah Reseller */}
          <button
            type="button"
            onClick={() =>
              setShowAddModal(true)
            }
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            + Tambah Reseller
          </button>
        </div>

        {/* Data Reseller */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Memuat data reseller...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          </div>
        ) : filteredResellers.length === 0 ? (
          search.trim() ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                🔍
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-800">
                Reseller tidak ditemukan
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Tidak ada reseller yang sesuai dengan
                pencarian{" "}
                <span className="font-medium text-slate-700">
                  &ldquo;{search}&rdquo;
                </span>
                .
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                🏪
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-800">
                Belum ada reseller
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Belum ada data reseller yang tersedia.
                Silakan tambahkan reseller terlebih dahulu.
              </p>
            </div>
          )
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Nama Toko
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Nama Pemilik
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      No. WhatsApp
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Alamat
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResellers.map(
                    (reseller) => (
                      <tr
                        key={reseller.id_reseller}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {reseller.nama_toko}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {reseller.nama_pemilik}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {reseller.no_whatsapp}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {reseller.alamat}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              reseller.is_active
                                ? "bg-green-50 text-green-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {reseller.is_active
                              ? "Aktif"
                              : "Tidak Aktif"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEditReseller(
                                  reseller
                                )
                              }
                              className="rounded-lg px-3 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteReseller(reseller)
                              }
                              disabled={submitting}
                              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =========================
          MODAL TAMBAH RESELLER
      ========================= */}
      <AddResellerModal
        isOpen={showAddModal}
        onClose={() =>
          setShowAddModal(false)
        }
        onSubmit={handleAddReseller}
        submitting={submitting}
      />

      {/* =========================
          MODAL EDIT RESELLER
      ========================= */}
      <EditResellerModal
        key={
          selectedReseller?.id_reseller ||
          "edit-reseller"
        }
        isOpen={showEditModal}
        reseller={selectedReseller}
        onClose={() => {
          setShowEditModal(false);
          setSelectedReseller(null);
        }}
        onSubmit={handleEditResellerSubmit}
        submitting={submitting}
      />
    </DashboardLayout>
  );
}